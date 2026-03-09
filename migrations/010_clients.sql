-- Migration: Add clients table for Client Showcase feature
-- Stores tiered client entries displayed on the public landing page

CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  domain      TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#0066CC',
  description TEXT NOT NULL DEFAULT '',
  tier        TEXT NOT NULL CHECK (tier IN ('high', 'medium', 'low')) DEFAULT 'medium',
  seo_value   INTEGER NOT NULL DEFAULT 70,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with RMI flagship clients
INSERT INTO clients (name, domain, color, description, tier, seo_value, sort_order) VALUES
  ('Ford Motor Company',    'ford.com',         '#003399', 'Ford HUB World HQ insulation',       'high',   98, 1),
  ('Henry Ford Health',     'henryford.com',    '#003087', 'Year-round hospital campus insulation','high',  91, 2),
  ('DTE Energy',            'dteenergy.com',    '#0066CC', 'Industrial facility insulation',      'high',   84, 3),
  ('General Motors',        'gm.com',           '#0170CE', 'Plant maintenance insulation',        'medium', 95, 1),
  ('Stellantis',            'stellantis.com',   '#C00000', 'Assembly facility insulation',        'medium', 80, 2),
  ('CMS Energy',            'cmsenergy.com',    '#005BAA', 'Power generation insulation',         'medium', 76, 3),
  ('Beaumont Health',       'beaumont.org',     '#003DA5', 'Hospital mechanical insulation',      'medium', 78, 4),
  ('Michigan Central',      'michigancentral.com','#8B6914','Historic restoration insulation',   'medium', 72, 5),
  ('University of Michigan','umich.edu',        '#FFCB05', 'Campus facility insulation',          'low',    88, 1),
  ('Wayne County',          'waynecounty.com',  '#1B4F72', 'County facility mechanical work',     'low',    60, 2),
  ('Detroit Metro Airport', 'metroairport.com', '#1A3A5C', 'Terminal mechanical insulation',      'low',    70, 3);
