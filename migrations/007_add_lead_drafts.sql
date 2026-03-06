-- Lead drafts: AI-generated response drafts awaiting Graham's approval
CREATE TABLE IF NOT EXISTS lead_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  draft_subject   TEXT NOT NULL,
  draft_body      TEXT NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'sent', 'edited', 'skipped'
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at         TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ld_contact_id ON lead_drafts(contact_id);
CREATE INDEX IF NOT EXISTS idx_ld_status ON lead_drafts(status);
