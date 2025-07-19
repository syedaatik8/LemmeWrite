/*
  # Fix Points Allocation System

  1. Updates
    - Ensure user_points table has proper constraints
    - Add function to safely add points to user account
    - Add function to initialize user points if not exists
    - Add trigger to auto-create points record for new users

  2. Functions
    - `initialize_user_points` - Creates default points record for user
    - `add_points_to_user` - Safely adds points to existing balance
    - `get_or_create_user_points` - Gets points or creates default record
*/

-- Function to initialize user points with default values
CREATE OR REPLACE FUNCTION initialize_user_points(target_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO user_points (user_id, points_remaining, points_total, last_reset, updated_at)
  VALUES (target_user_id, 50, 50, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely add points to user account
CREATE OR REPLACE FUNCTION add_points_to_user(
  target_user_id uuid,
  points_to_add integer
)
RETURNS integer AS $$
DECLARE
  current_points integer;
  new_total integer;
BEGIN
  -- Ensure user has a points record
  PERFORM initialize_user_points(target_user_id);
  
  -- Get current points
  SELECT points_remaining INTO current_points
  FROM user_points
  WHERE user_id = target_user_id;
  
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
  
  RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user points or create default record
CREATE OR REPLACE FUNCTION get_or_create_user_points(target_user_id uuid)
RETURNS TABLE(points_remaining integer, points_total integer) AS $$
BEGIN
  -- Try to get existing points
  RETURN QUERY
  SELECT up.points_remaining, up.points_total
  FROM user_points up
  WHERE up.user_id = target_user_id;
  
  -- If no record found, create one and return it
  IF NOT FOUND THEN
    PERFORM initialize_user_points(target_user_id);
    
    RETURN QUERY
    SELECT up.points_remaining, up.points_total
    FROM user_points up
    WHERE up.user_id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to auto-create points record for new users
CREATE OR REPLACE FUNCTION handle_new_user_points()
RETURNS trigger AS $$
BEGIN
  -- Create points record for new user
  PERFORM initialize_user_points(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created_points ON auth.users;
CREATE TRIGGER on_auth_user_created_points
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_points();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION initialize_user_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_points_to_user(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user_points(uuid) TO authenticated;

-- Ensure all existing users have points records
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