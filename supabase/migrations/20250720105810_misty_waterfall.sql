@@ .. @@
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
-    points_total = new_total,
+    points_total = GREATEST(points_total, new_total),
     last_reset = now(),
     updated_at = now()
   WHERE user_id = target_user_id;
   
   -- Return the new total
   RETURN new_total;
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;