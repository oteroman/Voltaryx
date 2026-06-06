-- ============================================================
-- 005: Work Orders (tabla central)
-- ============================================================

CREATE TABLE work_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  order_number    TEXT NOT NULL,
  customer_id     UUID NOT NULL REFERENCES customers(id),
  site_id         UUID NOT NULL REFERENCES sites(id),
  assigned_to     UUID REFERENCES profiles(id),
  supervisor_id   UUID REFERENCES profiles(id),

  type            TEXT NOT NULL
    CHECK (type IN ('preventive','corrective','emergency','installation','inspection')),
  status          TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_transit','on_site','in_progress','completed','cancelled')),
  priority        TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','critical')),

  scheduled_date  DATE NOT NULL,
  scheduled_time  TIME,
  estimated_duration_min INT,

  started_at      TIMESTAMPTZ,
  arrived_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,

  description     TEXT,
  internal_notes  TEXT,
  completion_notes TEXT,

  requires_signature BOOLEAN NOT NULL DEFAULT true,
  signed_by       TEXT,
  signed_at       TIMESTAMPTZ,
  signature_url   TEXT,

  report_url      TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, order_number)
);

CREATE INDEX idx_wo_tenant          ON work_orders(tenant_id);
CREATE INDEX idx_wo_assigned        ON work_orders(assigned_to);
CREATE INDEX idx_wo_scheduled_date  ON work_orders(scheduled_date);
CREATE INDEX idx_wo_status          ON work_orders(status);
CREATE INDEX idx_wo_customer        ON work_orders(customer_id);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Técnico: solo sus propias órdenes
CREATE POLICY "wo_technician_own" ON work_orders
  FOR ALL USING (
    tenant_id = auth.tenant_id()
    AND (
      assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role IN ('tenant_admin','supervisor','super_admin')
          AND tenant_id = auth.tenant_id()
      )
    )
  );

CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto order number: WO-YYYYMM-NNNN
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_prefix TEXT;
  v_seq    INT;
BEGIN
  v_prefix := 'WO-' || to_char(now(), 'YYYYMM') || '-';
  SELECT COALESCE(MAX(NULLIF(regexp_replace(order_number, '^WO-\d{6}-', ''), '')::INT), 0) + 1
    INTO v_seq
    FROM work_orders
   WHERE tenant_id = NEW.tenant_id
     AND order_number LIKE v_prefix || '%';
  NEW.order_number := v_prefix || lpad(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER work_orders_order_number
  BEFORE INSERT ON work_orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_order_number();

-- ─────────────────────────────────────────────────────────────

CREATE TABLE work_order_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  asset_id        UUID NOT NULL REFERENCES assets(id),
  checklist_data  JSONB NOT NULL DEFAULT '{}',
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (work_order_id, asset_id)
);

CREATE INDEX idx_woa_tenant      ON work_order_assets(tenant_id);
CREATE INDEX idx_woa_work_order  ON work_order_assets(work_order_id);
CREATE INDEX idx_woa_asset       ON work_order_assets(asset_id);

ALTER TABLE work_order_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "woa_tenant_isolation" ON work_order_assets
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE TRIGGER woa_updated_at
  BEFORE UPDATE ON work_order_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
