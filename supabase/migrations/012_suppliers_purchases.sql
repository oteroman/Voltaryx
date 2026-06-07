-- ============================================================
-- 012: Suppliers, Purchase Orders, stock_min
-- ============================================================

-- Proveedores
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  name          TEXT NOT NULL,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  ruc           TEXT,
  address       TEXT,
  payment_days  INT DEFAULT 30,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_tenant_isolation" ON suppliers
  FOR ALL USING (tenant_id = get_tenant_id());
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Órdenes de compra
CREATE TABLE purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  po_number     TEXT NOT NULL,
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  created_by    UUID REFERENCES profiles(id),

  status        TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','confirmed','partial','received','cancelled')),

  order_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,

  subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  igv_pct       NUMERIC(5,2)  NOT NULL DEFAULT 18,
  igv           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,

  notes         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, po_number)
);

CREATE INDEX idx_po_tenant    ON purchase_orders(tenant_id);
CREATE INDEX idx_po_supplier  ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status    ON purchase_orders(status);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_tenant_isolation" ON purchase_orders
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-número OC: OC-YYYYMM-NNNN
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_prefix TEXT; v_seq INT;
BEGIN
  v_prefix := 'OC-' || to_char(now(), 'YYYYMM') || '-';
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(po_number, '^OC-\d{6}-', ''), '')::INT
  ), 0) + 1
    INTO v_seq FROM purchase_orders
   WHERE tenant_id = NEW.tenant_id AND po_number LIKE v_prefix || '%';
  NEW.po_number := v_prefix || lpad(v_seq::TEXT, 4, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER purchase_orders_po_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
  EXECUTE FUNCTION generate_po_number();

-- Líneas de OC
CREATE TABLE purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id),

  description       TEXT NOT NULL,
  quantity_ordered  INT  NOT NULL DEFAULT 1 CHECK (quantity_ordered > 0),
  quantity_received INT  NOT NULL DEFAULT 0,
  unit_cost         NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order        INT  NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_poi_order ON purchase_order_items(purchase_order_id);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poi_tenant_isolation" ON purchase_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE id = purchase_order_id AND tenant_id = get_tenant_id()
    )
  );

-- Stock mínimo en products (alerta de reposición)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_min INT NOT NULL DEFAULT 0;
