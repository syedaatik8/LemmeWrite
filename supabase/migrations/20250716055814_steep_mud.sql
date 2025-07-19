/*
  # Add Image Keywords and Schedule Stopping Features

  1. Schema Updates
    - Add `image_keywords` field to post_schedules table for user-defined image search terms
    - Add `stop_condition` field to define when to stop the schedule
    - Add `stop_date` field for date-based stopping
    - Add `max_posts` field for post-count-based stopping

  2. Changes
    - `image_keywords` (text) - User-defined keywords for image search
    - `stop_condition` (text) - 'never', 'date', 'post_count', 'points_exhausted'
    - `stop_date` (timestamptz) - When to stop if stop_condition is 'date'
    - `max_posts` (integer) - Maximum posts to generate if stop_condition is 'post_count'
*/

-- Add new columns to post_schedules table
ALTER TABLE post_schedules 
ADD COLUMN IF NOT EXISTS image_keywords text,
ADD COLUMN IF NOT EXISTS stop_condition text DEFAULT 'points_exhausted' CHECK (stop_condition IN ('never', 'date', 'post_count', 'points_exhausted')),
ADD COLUMN IF NOT EXISTS stop_date timestamptz,
ADD COLUMN IF NOT EXISTS max_posts integer;

-- Create index for stop_date queries
CREATE INDEX IF NOT EXISTS idx_post_schedules_stop_date ON post_schedules(stop_date) WHERE stop_condition = 'date';

-- Update the calculate_next_post_date function to handle stopping conditions
CREATE OR REPLACE FUNCTION calculate_next_post_date(
  frequency_type text,
  publish_time time,
  from_date timestamptz DEFAULT now()
)
RETURNS timestamptz AS $$
DECLARE
  next_date timestamptz;
  target_time timestamptz;
BEGIN
  -- Calculate base date for today at the specified time
  target_time := date_trunc('day', from_date) + publish_time;
  
  -- If the time has already passed today, start from tomorrow
  IF target_time <= from_date THEN
    target_time := target_time + interval '1 day';
  END IF;
  
  -- Calculate next date based on frequency
  CASE frequency_type
    WHEN 'daily' THEN
      next_date := target_time;
    WHEN 'weekly' THEN
      next_date := target_time;
    WHEN 'biweekly' THEN
      next_date := target_time;
    WHEN 'monthly' THEN
      next_date := target_time;
    ELSE
      next_date := target_time;
  END CASE;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Update the update_next_post_date function to handle stopping conditions
CREATE OR REPLACE FUNCTION update_next_post_date(schedule_id uuid)
RETURNS void AS $$
DECLARE
  schedule_record post_schedules%ROWTYPE;
  next_date timestamptz;
  should_stop boolean := false;
BEGIN
  -- Get the schedule record
  SELECT * INTO schedule_record FROM post_schedules WHERE id = schedule_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check stopping conditions
  CASE schedule_record.stop_condition
    WHEN 'date' THEN
      IF schedule_record.stop_date IS NOT NULL AND now() >= schedule_record.stop_date THEN
        should_stop := true;
      END IF;
    WHEN 'post_count' THEN
      IF schedule_record.max_posts IS NOT NULL AND schedule_record.posts_generated >= schedule_record.max_posts THEN
        should_stop := true;
      END IF;
    WHEN 'never' THEN
      should_stop := false;
    WHEN 'points_exhausted' THEN
      -- This will be handled by the application logic
      should_stop := false;
  END CASE;
  
  -- If should stop, mark as completed
  IF should_stop THEN
    UPDATE post_schedules 
    SET 
      status = 'completed',
      updated_at = now()
    WHERE id = schedule_id;
    RETURN;
  END IF;
  
  -- Calculate next date based on frequency
  CASE schedule_record.frequency
    WHEN 'daily' THEN
      next_date := schedule_record.next_post_date + interval '1 day';
    WHEN 'weekly' THEN
      next_date := schedule_record.next_post_date + interval '1 week';
    WHEN 'biweekly' THEN
      next_date := schedule_record.next_post_date + interval '2 weeks';
    WHEN 'monthly' THEN
      next_date := schedule_record.next_post_date + interval '1 month';
  END CASE;
  
  -- Update the schedule
  UPDATE post_schedules 
  SET 
    next_post_date = next_date,
    posts_generated = posts_generated + 1,
    updated_at = now()
  WHERE id = schedule_id;
END;
$$ LANGUAGE plpgsql;