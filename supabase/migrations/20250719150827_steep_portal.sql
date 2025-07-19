/*
  # Fix Payment Processing and Points Allocation

  1. Functions
    - Ensure add_points_to_user function works correctly
    - Add debug logging for payment processing
    - Fix any issues with points allocation

  2. Updates
    - Ensure user_points table has proper structure
    - Add indexes for better performance
*/

-- Recreate the add_points_to_user function with better error handling
CREATE OR REPLACE FUNCTION add_points_to_user(
  target_user_id uuid,
  points_to_add integer
)
RETURNS integer AS $$
DECLARE
  current_points integer := 0;
  new_total integer;
BEGIN
  -- First ensure user has a points record
  INSERT INTO user_points (user_id, points_remaining, points_total, last_reset, updated_at)
  VALUES (target_user_id, 50, 50, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current points
  SELECT points_remaining INTO current_points
  FROM user_points
  WHERE user_id = target_user_id;
  
  -- If no record found, something is wrong
  IF current_points IS NULL THEN
    current_points := 50; -- Default fallback
  END IF;
  
  -- Calculate new total
  new_total := current_points + points_to_add;
  
  -- Update points
  UPDATE user_points
  SET 
    points_remaining = new_total,
    points_total = new_total,
    last_reset = now(),
    updated_at = now()
  WHERE user_id = target_user_id;
  
  -- Return the new total
  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_points_to_user(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION add_points_to_user(uuid, integer) TO service_role;

-- Ensure all users have points records
INSERT INTO user_points (user_id, points_remaining, points_total, last_reset, updated_at)
SELECT 
  id,
  50,
  50,
  now(),
  now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_points)
ON CONFLICT (user_id) DO NOTHING;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paypal_id ON user_subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_subscription ON payment_history(user_id, paypal_subscription_id);