-- Contact form submissions table
-- Used by /contact page; FL/NE/TX two-methods compliance (form + email)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Allow anonymous inserts (contact form is public, no auth required)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact submissions"
  ON contact_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service_role can read submissions (admin use)
CREATE POLICY "Service role can read contact submissions"
  ON contact_submissions FOR SELECT
  TO service_role
  USING (true);
