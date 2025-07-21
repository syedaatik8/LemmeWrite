/*
  # Fix Double Points Allocation Issue

  1. New Functions
    - `allocate_points_with_history` - Atomically allocate points and log history
    - `check_existing_allocation` - Check if points were already allocated

  2. Updates
    - Prevent double allocation through atomic operations
    - Better logging and error handling
*/

-- Function to atomically allocate points and log payment history
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
BEGIN
  -- Check if allocation already exists (atomic check)
  SELECT COUNT(*) INTO existing_count
  FROM payment_history
  WHERE user_id = target_user_id
    AND paypal_subscription_id = subscription_id
    AND event_type IN ('webhook_points_allocation', 'manual_points_allocation', 'subscription_activated', 'payment_completed');
  
  -- If allocation already exists, return false
  IF existing_count > 0 THEN
    RAISE NOTICE 'Points already allocated for subscription %', subscription_id;
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
  
  -- Log the allocation
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
    'webhook_points_allocation',
    plan_amount,
    'USD',
    now()
  );
  
  RAISE NOTICE 'Successfully allocated % points to user %. New total: %', points_to_add, target_user_id, new_total;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if allocation already exists
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
    AND event_type IN ('webhook_points_allocation', 'manual_points_allocation', 'subscription_activated', 'payment_completed');
  
  RETURN existing_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION allocate_points_with_history(uuid, integer, text, decimal) TO service_role;
GRANT EXECUTE ON FUNCTION check_existing_allocation(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION check_existing_allocation(uuid, text) TO authenticated;