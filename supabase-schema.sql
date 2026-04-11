-- ============================================
-- TABLE: leads
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cookie_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  course_interest TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_cookie_id ON leads(cookie_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- ============================================
-- TABLE: page_visits
-- ============================================
CREATE TABLE IF NOT EXISTS page_visits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  cookie_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  page_title TEXT,
  visited_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_visits_lead_id ON page_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_cookie_id ON page_visits(cookie_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_visited_at ON page_visits(visited_at DESC);

-- ============================================
-- ENABLE REALTIME on page_visits
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE page_visits;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert on leads"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon select on leads"
  ON leads FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on page_visits"
  ON page_visits FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon select on page_visits"
  ON page_visits FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- VIEW: enriched_visits
-- ============================================
CREATE OR REPLACE VIEW enriched_visits AS
SELECT
  pv.id AS visit_id,
  pv.page_url,
  pv.page_title,
  pv.visited_at,
  l.id AS lead_id,
  l.name,
  l.email,
  l.phone,
  l.course_interest
FROM page_visits pv
JOIN leads l ON l.id = pv.lead_id
ORDER BY pv.visited_at DESC;
