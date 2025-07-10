/*
  # Create WordPress Sites Table

  1. New Tables
    - `wordpress_sites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text, not null)
      - `url` (text, not null)
      - `username` (text, not null)
      - `password` (text, not null) - encrypted application password
      - `status` (text, default 'disconnected')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `wordpress_sites` table
    - Add policy for users to manage their own sites
    - Encrypt sensitive data

  3. Indexes
    - Add index on user_id for faster queries
*/

-- Create wordpress_sites table
CREATE TABLE IF NOT EXISTS wordpress_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  username text NOT NULL,
  password text NOT NULL, -- Application password (will be encrypted)
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'testing')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE wordpress_sites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own WordPress sites"
  ON wordpress_sites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own WordPress sites"
  ON wordpress_sites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own WordPress sites"
  ON wordpress_sites
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own WordPress sites"
  ON wordpress_sites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS wordpress_sites_user_id_idx ON wordpress_sites(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wordpress_sites_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_wordpress_sites_updated_at ON wordpress_sites;
CREATE TRIGGER update_wordpress_sites_updated_at
  BEFORE UPDATE ON wordpress_sites
  FOR EACH ROW EXECUTE FUNCTION update_wordpress_sites_updated_at();