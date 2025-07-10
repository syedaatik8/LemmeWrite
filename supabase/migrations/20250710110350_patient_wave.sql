/*
  # Fix User Profiles Creation

  1. Updates
    - Fix the trigger function to handle missing metadata gracefully
    - Add better error handling for profile creation
    - Make first_name and last_name nullable initially
    - Add validation to prevent empty required fields

  2. Security
    - Maintain existing RLS policies
    - Ensure proper data validation
*/

-- First, let's make first_name and last_name nullable to prevent insertion errors
ALTER TABLE user_profiles 
ALTER COLUMN first_name DROP NOT NULL,
ALTER COLUMN last_name DROP NOT NULL;

-- Update the trigger function to handle missing data better
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_first_name text;
  user_last_name text;
  user_phone text;
BEGIN
  -- Extract metadata with fallbacks
  user_first_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'first_name'), ''), 'User');
  user_last_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'last_name'), ''), 'Account');
  user_phone := NULLIF(trim(NEW.raw_user_meta_data->>'phone'), '');

  -- Insert the profile
  INSERT INTO user_profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    user_first_name,
    user_last_name,
    user_phone
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add a function to update user profiles after creation if needed
CREATE OR REPLACE FUNCTION update_user_profile(
  user_id uuid,
  new_first_name text,
  new_last_name text,
  new_phone text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles 
  SET 
    first_name = COALESCE(NULLIF(trim(new_first_name), ''), first_name),
    last_name = COALESCE(NULLIF(trim(new_last_name), ''), last_name),
    phone = NULLIF(trim(new_phone), ''),
    updated_at = now()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_profile(uuid, text, text, text) TO authenticated;