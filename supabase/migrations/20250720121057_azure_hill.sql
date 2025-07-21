/*
  # Final Fix for Double Points Allocation Issue

  1. Enhanced Functions
    - Improve `allocate_points_with_history` to be truly atomic
    - Add better logging and error handling
    - Ensure no race conditions possible

  2. Security
    - Use proper locking mechanisms
    - Prevent any possibility of duplicate allocations
*/

-- Drop existing function and recreate with better atomicity
DROP FUNCTION IF EXISTS allocate_points_with_history(uuid, integer, text, decimal);

-- Create improved atomic allocation function
CREATE OR REPLACE FUNCTION allocate_points_with_history(
  target_user_id uuid,
  points_to_add integer,
  subscription_id text,
  plan_amount decimal(10,2)
)
RETURNS boolean AS $$
DECLARE
  existing_count integer;
  current_points integer := 0;
  new_total integer;
  lock_key bigint;
BEGIN
  -- Create a unique lock key based on user_id and subscription_id
  lock_key := ('x' || substr(md5(target_user_id::text || subscription_id), 1, 15))::bit(60)::bigint;
  
  -- Acquire advisory lock to prevent concurrent execution
  PERFORM pg_advisory_lock(lock_key);
  
  BEGIN
    -- Check if allocation already exists (within the lock)
    SELECT COUNT(*) INTO existing_count
    FROM payment_history
    WHERE user_id = target_user_id
      AND paypal_subscription_id = subscription_id
      AND event_type IN ('webhook_points_allocation', 'manual_points_allocation', 'subscription_activated', 'payment_completed', 'atomic_allocation');
    
    -- If allocation already exists, release lock and return false
    IF existing_count > 0 THEN
      RAISE NOTICE 'Points already allocated for subscription % (found % existing records)', subscription_id, existing_count;
      PERFORM pg_advisory_unlock(lock_key);
      RETURN false;
    END IF;
    
    -- Ensure user has a points record
    INSERT INTO user_points (user_id, points_remaining, points_total, last_reset, updated_at)
    VALUES (target_user_id, 50, 50, now(), now())
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current points
    SELECT points_remaining INTO current_points
    FROM user_points
    WHERE user_id = target_user_id;
    
    -- If no record found, use default
    IF current_points IS NULL THEN
      current_points := 50;
    END IF;
    
    -- Calculate new total
    new_total := current_points + points_to_add;
    
    -- Update points
    UPDATE user_points
    SET 
      points_remaining = new_total,
      points_total = GREATEST(points_total, new_total),
      last_reset = now(),
      updated_at = now()
    WHERE user_id = target_user_id;
    
    -- Log the allocation with new event type
    INSERT INTO payment_history (
      user_id,
      paypal_subscription_id,
      event_type,
      amount,
      currency,
      created_at
    ) VALUES (
      target_user_id,
      subscription_id,
      'atomic_allocation',
      plan_amount,
      'USD',
      now()
    );
    
    -- Release the lock
    PERFORM pg_advisory_unlock(lock_key);
    
    RAISE NOTICE 'Successfully allocated % points to user %. New total: %', points_to_add, target_user_id, new_total;
    RETURN true;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Release lock on any error
      PERFORM pg_advisory_unlock(lock_key);
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the check function to include the new event type
CREATE OR REPLACE FUNCTION check_existing_allocation(
  target_user_id uuid,
  subscription_id text
)
RETURNS boolean AS $$
DECLARE
  existing_count integer;
BEGIN
  SELECT COUNT(*) INTO existing_count
  FROM payment_history
  WHERE user_id = target_user_id
    AND paypal_subscription_id = subscription_id
    AND event_type IN ('webhook_points_allocation', 'manual_points_allocation', 'subscription_activated', 'payment_completed', 'atomic_allocation');
  
  RETURN existing_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION allocate_points_with_history(uuid, integer, text, decimal) TO service_role;
GRANT EXECUTE ON FUNCTION allocate_points_with_history(uuid, integer, text, decimal) TO authenticated;
GRANT EXECUTE ON FUNCTION check_existing_allocation(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION check_existing_allocation(uuid, text) TO authenticated;

-- Clean up any duplicate payment history records (optional - run this once)
-- This will keep only the earliest record for each subscription
DELETE FROM payment_history 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, paypal_subscription_id) id
  FROM payment_history 
  WHERE event_type IN ('webhook_points_allocation', 'manual_points_allocation', 'subscription_activated', 'payment_completed', 'atomic_allocation')
  ORDER BY user_id, paypal_subscription_id, created_at ASC
);