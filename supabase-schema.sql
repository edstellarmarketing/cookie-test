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

-- Domain column for multi-site tracking
ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS domain TEXT;
CREATE INDEX IF NOT EXISTS idx_page_visits_domain ON page_visits(domain);

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
-- TABLE: lead_milestones
-- ============================================
CREATE TABLE IF NOT EXISTS lead_milestones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  milestone_type TEXT NOT NULL,
  milestone_label TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  achieved_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_milestones_lead_id ON lead_milestones(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_milestones_type ON lead_milestones(milestone_type);

-- Most milestones are one-per-lead; repeat_course_visit and re_engaged_after_gap can fire multiple times
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_milestones_unique
  ON lead_milestones(lead_id, milestone_type)
  WHERE milestone_type NOT IN ('repeat_course_visit', 're_engaged_after_gap');

ALTER TABLE lead_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert on lead_milestones"
  ON lead_milestones FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon select on lead_milestones"
  ON lead_milestones FOR SELECT
  TO anon
  USING (true);

-- Enable realtime on lead_milestones
ALTER PUBLICATION supabase_realtime ADD TABLE lead_milestones;

-- ============================================
-- TABLE: cart_events
-- ============================================
CREATE TABLE IF NOT EXISTS cart_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  cookie_id TEXT NOT NULL,
  course_slug TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- 'add_to_cart', 'checkout_started', 'payment_completed', 'cart_abandoned'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_events_lead_id ON cart_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_cart_events_cookie_id ON cart_events(cookie_id);
CREATE INDEX IF NOT EXISTS idx_cart_events_type ON cart_events(event_type);

ALTER TABLE cart_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert on cart_events"
  ON cart_events FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon select on cart_events"
  ON cart_events FOR SELECT
  TO anon
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE cart_events;

-- ============================================
-- ADD SCORE COLUMNS TO leads
-- ============================================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_temperature TEXT DEFAULT 'Cold',
  ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================
-- TABLE: course_banners
-- ============================================
CREATE TABLE IF NOT EXISTS course_banners (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_slug TEXT NOT NULL,
  scenario TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  offer_text TEXT NOT NULL DEFAULT 'Limited Time Offer!',
  discount_percent INTEGER DEFAULT 10,
  timer_hours NUMERIC(4,1) DEFAULT 4,
  cta_text TEXT DEFAULT 'Enroll Now',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_slug, scenario)
);

ALTER TABLE course_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on course_banners"
  ON course_banners FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on course_banners"
  ON course_banners FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on course_banners"
  ON course_banners FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VIEW: enriched_visits
-- ============================================
-- ============================================
-- TABLE: admin_settings
-- ============================================
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role all on admin_settings"
  ON admin_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TABLE: email_logs
-- ============================================
CREATE TABLE IF NOT EXISTS email_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  trigger_event TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  ai_reasoning TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_email_logs_lead_id ON email_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role all on email_logs"
  ON email_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon select on email_logs"
  ON email_logs FOR SELECT
  TO anon
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE email_logs;

-- ============================================
-- VIEW: enriched_visits
-- ============================================
CREATE OR REPLACE VIEW enriched_visits AS
SELECT
  pv.id AS visit_id,
  pv.page_url,
  pv.page_title,
  pv.domain,
  pv.visited_at,
  l.id AS lead_id,
  l.name,
  l.email,
  l.phone,
  l.course_interest
FROM page_visits pv
JOIN leads l ON l.id = pv.lead_id
ORDER BY pv.visited_at DESC;
