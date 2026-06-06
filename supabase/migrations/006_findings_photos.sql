-- ============================================================
-- 006: Findings & Photos
-- ============================================================

CREATE TABLE findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  asset_id        UUID REFERENCES assets(id),
  reported_by     UUID REFERENCES profiles(id),

  title           TEXT NOT NULL,
  description     TEXT,
  severity        TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  category        TEXT
    CHECK (category IN ('electrical','mechanical','thermal','physical','software','other')),

  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','wont_fix')),
  resolution_notes TEXT,
  resolved_at     TIMESTAMPTZ,

  is_opportunity  BOOLEAN NOT NULL DEFAULT false,
  estimated_value NUMERIC(12,2),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_findings_tenant     ON findings(tenant_id);
CREATE INDEX idx_findings_work_order ON findings(work_order_id);
CREATE INDEX idx_findings_severity   ON findings(severity);
CREATE INDEX idx_findings_status     ON findings(status);

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "findings_tenant_isolation" ON findings
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE TRIGGER findings_updated_at
  BEFORE UPDATE ON findings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────

CREATE TABLE photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  asset_id        UUID REFERENCES assets(id),
  finding_id      UUID REFERENCES findings(id),
  uploaded_by     UUID REFERENCES profiles(id),

  storage_path    TEXT NOT NULL,
  thumbnail_path  TEXT,
  caption         TEXT,
  taken_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_size_bytes INT,
  width           INT,
  height          INT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_tenant     ON photos(tenant_id);
CREATE INDEX idx_photos_work_order ON photos(work_order_id);
CREATE INDEX idx_photos_finding    ON photos(finding_id);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_tenant_isolation" ON photos
  FOR ALL USING (tenant_id = get_tenant_id());
