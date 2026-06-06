-- ============================================================
-- 004: Asset Types & Assets
-- ============================================================

CREATE TABLE asset_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL
    CHECK (category IN ('ups','stabilizer','battery_bank','precision_ac','other')),
  checklist   JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_types_tenant ON asset_types(tenant_id);

ALTER TABLE asset_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_types_tenant_isolation" ON asset_types
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE TRIGGER asset_types_updated_at
  BEFORE UPDATE ON asset_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────

CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  site_id         UUID NOT NULL REFERENCES sites(id),
  asset_type_id   UUID REFERENCES asset_types(id),
  name            TEXT NOT NULL,
  brand           TEXT,
  model           TEXT,
  serial_number   TEXT,
  capacity_kva    NUMERIC(10,2),
  installation_date DATE,
  warranty_expiry   DATE,
  status          TEXT NOT NULL DEFAULT 'operational'
    CHECK (status IN ('operational','degraded','critical','retired')),
  location_notes  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_tenant  ON assets(tenant_id);
CREATE INDEX idx_assets_site    ON assets(site_id);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_tenant_isolation" ON assets
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
