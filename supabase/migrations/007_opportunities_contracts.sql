-- ============================================================
-- 007: Opportunities & Contracts
-- ============================================================

CREATE TABLE opportunities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  site_id         UUID REFERENCES sites(id),
  finding_id      UUID REFERENCES findings(id),
  created_by      UUID REFERENCES profiles(id),
  assigned_to     UUID REFERENCES profiles(id),

  title           TEXT NOT NULL,
  description     TEXT,
  stage           TEXT NOT NULL DEFAULT 'identified'
    CHECK (stage IN ('identified','qualified','proposal','negotiation','won','lost')),
  probability     INT DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  estimated_value NUMERIC(12,2),
  currency        TEXT NOT NULL DEFAULT 'USD',
  expected_close  DATE,
  lost_reason     TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_opp_tenant   ON opportunities(tenant_id);
CREATE INDEX idx_opp_customer ON opportunities(customer_id);
CREATE INDEX idx_opp_stage    ON opportunities(stage);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opp_tenant_isolation" ON opportunities
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE TRIGGER opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────

CREATE TABLE contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  opportunity_id  UUID REFERENCES opportunities(id),

  contract_number TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'maintenance'
    CHECK (type IN ('maintenance','monitoring','project','adhoc')),
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','expired','cancelled')),

  start_date      DATE NOT NULL,
  end_date        DATE,
  value           NUMERIC(12,2),
  currency        TEXT NOT NULL DEFAULT 'USD',
  billing_cycle   TEXT DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','quarterly','annual','one_time')),

  sla_response_hours   INT DEFAULT 4,
  sla_resolution_hours INT DEFAULT 24,
  visits_per_year      INT,

  notes           TEXT,
  document_url    TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, contract_number)
);

CREATE INDEX idx_contracts_tenant   ON contracts(tenant_id);
CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_status   ON contracts(status);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_tenant_isolation" ON contracts
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
