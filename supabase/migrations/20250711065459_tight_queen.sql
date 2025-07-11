/*
  # Add Post Scheduling Functions

  1. Functions
    - `calculate_next_post_date` - Calculate when the next post should be scheduled
    - `update_next_post_date` - Update schedule after posting
    - `create_immediate_post` - Create a post for immediate publishing

  2. Updates
    - Add functions needed for post scheduling system
*/

-- Function to calculate next post date
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

-- Function to update next post date after posting
CREATE OR REPLACE FUNCTION update_next_post_date(schedule_id uuid)
RETURNS void AS $$
DECLARE
  schedule_record post_schedules%ROWTYPE;
  next_date timestamptz;
BEGIN
  -- Get the schedule record
  SELECT * INTO schedule_record FROM post_schedules WHERE id = schedule_id;
  
  IF NOT FOUND THEN
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

-- Function to create an immediate post
CREATE OR REPLACE FUNCTION create_immediate_post(
  p_user_id uuid,
  p_wordpress_site_id uuid,
  p_schedule_type text,
  p_content_input text,
  p_description text,
  p_word_count integer
)
RETURNS uuid AS $$
DECLARE
  post_id uuid;
BEGIN
  -- Generate a new post ID
  post_id := gen_random_uuid();
  
  -- Insert the immediate post
  INSERT INTO scheduled_posts (
    id,
    schedule_id,
    user_id,
    wordpress_site_id,
    title,
    content,
    excerpt,
    tags,
    meta_description,
    seo_keywords,
    status,
    scheduled_for
  ) VALUES (
    post_id,
    null, -- No schedule for immediate posts
    p_user_id,
    p_wordpress_site_id,
    'Generated Post: ' || p_content_input,
    '<h2>Introduction</h2><p>This is a generated blog post about ' || p_content_input || '.</p><h2>Main Content</h2><p>Content will be generated using AI based on your ' || p_schedule_type || ': ' || p_content_input || COALESCE(' - ' || p_description, '') || '</p><h2>Conclusion</h2><p>This concludes our discussion on ' || p_content_input || '.</p>',
    'A comprehensive guide about ' || p_content_input,
    ARRAY[lower(replace(p_content_input, ' ', '-'))],
    'Learn everything about ' || p_content_input || ' in this comprehensive guide.',
    ARRAY[p_content_input],
    'pending',
    now()
  );
  
  RETURN post_id;
END;
$$ LANGUAGE plpgsql;