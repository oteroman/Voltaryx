-- ============================================================
-- 003: Customers & Sites
-- ============================================================

CREATE TABLE customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id),
  name       TEXT NOT NULL,
  tax_id     TEXT,
  industry   TEXT,
  tier       TEXT NOT NULL DEFAULT 'standard'
    CHECK (tier IN ('vip','premium','standard')),
  notes      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_tenant_isolation" ON customers
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────

CREATE TABLE sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  name            TEXT NOT NULL,
  address         TEXT,
  city            TEXT,
  country         TEXT NOT NULL DEFAULT 'PE',
  lat             NUMERIC(10,7),
  lng             NUMERIC(10,7),
  access_notes    TEXT,
  primary_contact TEXT,
  primary_phone   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sites_tenant   ON sites(tenant_id);
CREATE INDEX idx_sites_customer ON sites(customer_id);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sites_tenant_isolation" ON sites
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE TRIGGER sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
