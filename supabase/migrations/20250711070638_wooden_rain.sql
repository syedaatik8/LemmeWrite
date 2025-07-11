/*
  # Ensure Post Schedules Tables Exist

  1. New Tables (if not exists)
    - `post_schedules` - Main scheduling configuration
    - `scheduled_posts` - Individual posts generated from schedules

  2. Functions
    - Safe creation of scheduling functions only after tables exist

  3. Security
    - Enable RLS and create policies for both tables
*/

-- Create post_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wordpress_site_id uuid REFERENCES wordpress_sites(id) ON DELETE CASCADE NOT NULL,
  schedule_type text NOT NULL CHECK (schedule_type IN ('topic', 'category', 'keyword')),
  content_input text NOT NULL,
  description text,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  word_count integer NOT NULL DEFAULT 1000,
  publish_time time NOT NULL DEFAULT '09:00:00',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  next_post_date timestamptz,
  posts_generated integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scheduled_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES post_schedules(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wordpress_site_id uuid REFERENCES wordpress_sites(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  excerpt text NOT NULL,
  tags text[] DEFAULT '{}',
  meta_description text,
  seo_keywords text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'draft')),
  scheduled_for timestamptz NOT NULL,
  published_at timestamptz,
  wordpress_post_id integer,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'post_schedules' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE post_schedules ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'scheduled_posts' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies for post_schedules (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_schedules' AND policyname = 'Users can view own post schedules') THEN
    CREATE POLICY "Users can view own post schedules"
      ON post_schedules
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_schedules' AND policyname = 'Users can insert own post schedules') THEN
    CREATE POLICY "Users can insert own post schedules"
      ON post_schedules
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_schedules' AND policyname = 'Users can update own post schedules') THEN
    CREATE POLICY "Users can update own post schedules"
      ON post_schedules
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_schedules' AND policyname = 'Users can delete own post schedules') THEN
    CREATE POLICY "Users can delete own post schedules"
      ON post_schedules
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policies for scheduled_posts (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_posts' AND policyname = 'Users can view own scheduled posts') THEN
    CREATE POLICY "Users can view own scheduled posts"
      ON scheduled_posts
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_posts' AND policyname = 'Users can insert own scheduled posts') THEN
    CREATE POLICY "Users can insert own scheduled posts"
      ON scheduled_posts
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_posts' AND policyname = 'Users can update own scheduled posts') THEN
    CREATE POLICY "Users can update own scheduled posts"
      ON scheduled_posts
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_posts' AND policyname = 'Users can delete own scheduled posts') THEN
    CREATE POLICY "Users can delete own scheduled posts"
      ON scheduled_posts
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_post_schedules_user_id ON post_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_post_schedules_status ON post_schedules(status);
CREATE INDEX IF NOT EXISTS idx_post_schedules_next_post_date ON post_schedules(next_post_date) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_schedule_id ON scheduled_posts(schedule_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for) WHERE status = 'pending';

-- Now create the functions (only after tables exist)
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

-- Function to create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at (if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_post_schedules_updated_at') THEN
    CREATE TRIGGER update_post_schedules_updated_at
      BEFORE UPDATE ON post_schedules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_scheduled_posts_updated_at') THEN
    CREATE TRIGGER update_scheduled_posts_updated_at
      BEFORE UPDATE ON scheduled_posts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;