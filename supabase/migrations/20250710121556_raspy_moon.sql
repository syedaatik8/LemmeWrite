/*
  # Create WordPress Sites Table

  1. New Tables
    - `wordpress_sites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, site name)
      - `url` (text, WordPress site URL)
      - `status` (text, connection status)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `wordpress_sites` table
    - Add policy for authenticated users to manage their own sites

  3. Changes
    - Creates the wordpress_sites table that the AuthContext is trying to query
    - Adds proper RLS policies for data security
*/

CREATE TABLE IF NOT EXISTS wordpress_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE wordpress_sites ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to manage their own sites
CREATE POLICY "Users can view their own WordPress sites"
  ON wordpress_sites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WordPress sites"
  ON wordpress_sites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WordPress sites"
  ON wordpress_sites
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WordPress sites"
  ON wordpress_sites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_wordpress_sites_user_id ON wordpress_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_sites_status ON wordpress_sites(user_id, status);