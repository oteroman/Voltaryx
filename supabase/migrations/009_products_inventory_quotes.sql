-- ============================================================
-- 009: Products, Inventory Items, Quotes
-- ============================================================

-- Catálogo de productos (lo que se vende / alquila)
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),

  code            TEXT,
  category        TEXT NOT NULL DEFAULT 'ups'
    CHECK (category IN ('ups','battery_bank','module','cooling','ats','software','accessory','other')),
  description     TEXT NOT NULL,
  brand           TEXT,
  model           TEXT,
  power_kva       NUMERIC(10,2),
  phase           TEXT CHECK (phase IN ('monofasico','trifasico','dc','na')),

  -- Precios (dos niveles: distribuidor y precio final)
  cost_price              NUMERIC(12,2),
  distributor_margin_pct  NUMERIC(5,2),
  distributor_price       NUMERIC(12,2),
  final_margin_pct        NUMERIC(5,2),
  final_price             NUMERIC(12,2),

  -- Alquiler
  is_rentable             BOOLEAN NOT NULL DEFAULT false,
  rental_price_monthly    NUMERIC(12,2),

  -- Almacén
  stock_account   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_tenant   ON products(tenant_id);
CREATE INDEX idx_products_category ON products(category);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_tenant_isolation" ON products
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Unidades físicas serializadas (cada equipo individual)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE inventory_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  product_id      UUID NOT NULL REFERENCES products(id),

  serial_number   TEXT,
  item_code       TEXT,  -- código interno tipo 2601300016BWK9H

  -- Estado de la unidad
  status          TEXT NOT NULL DEFAULT 'stock'
    CHECK (status IN ('stock','deployed','workshop','transit','retired')),

  -- Ubicación física
  location        TEXT,

  -- Cuando está desplegado (alquiler / venta)
  customer_id     UUID REFERENCES customers(id),
  site_id         UUID REFERENCES sites(id),
  deployed_at     TIMESTAMPTZ,
  rental_monthly_rate NUMERIC(12,2),

  -- Cuando está en taller
  workshop_reason TEXT,
  workshop_since  TIMESTAMPTZ,
  -- Qué unidad lo está reemplazando mientras está en taller
  replaced_by_item_id UUID REFERENCES inventory_items(id),

  -- Compra / ingreso
  supplier        TEXT,
  purchase_order  TEXT,   -- OC
  invoice_number  TEXT,   -- FACTURA
  entry_date      DATE,
  purchase_price  NUMERIC(12,2),

  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_tenant   ON inventory_items(tenant_id);
CREATE INDEX idx_inv_product  ON inventory_items(product_id);
CREATE INDEX idx_inv_status   ON inventory_items(status);
CREATE INDEX idx_inv_customer ON inventory_items(customer_id);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_tenant_isolation" ON inventory_items
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Cotizaciones
-- ─────────────────────────────────────────────────────────────
CREATE TABLE quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  opportunity_id  UUID REFERENCES opportunities(id),
  created_by      UUID REFERENCES profiles(id),
  assigned_to     UUID REFERENCES profiles(id),

  quote_number    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','accepted','rejected','expired')),

  valid_until     DATE,
  subtotal        NUMERIC(12,2),
  igv_pct         NUMERIC(5,2) NOT NULL DEFAULT 18,
  igv             NUMERIC(12,2),
  total           NUMERIC(12,2),

  notes           TEXT,
  terms           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, quote_number)
);

CREATE INDEX idx_quotes_tenant   ON quotes(tenant_id);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status   ON quotes(status);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_tenant_isolation" ON quotes
  FOR ALL USING (tenant_id = get_tenant_id());

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-número cotización: COT-YYYYMM-NNNN
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_prefix TEXT; v_seq INT;
BEGIN
  v_prefix := 'COT-' || to_char(now(), 'YYYYMM') || '-';
  SELECT COALESCE(MAX(NULLIF(regexp_replace(quote_number, '^COT-\d{6}-', ''), '')::INT), 0) + 1
    INTO v_seq FROM quotes
   WHERE tenant_id = NEW.tenant_id AND quote_number LIKE v_prefix || '%';
  NEW.quote_number := v_prefix || lpad(v_seq::TEXT, 4, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER quotes_quote_number
  BEFORE INSERT ON quotes
  FOR EACH ROW WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
  EXECUTE FUNCTION generate_quote_number();

-- ─────────────────────────────────────────────────────────────
-- Líneas de cotización
-- ─────────────────────────────────────────────────────────────
CREATE TABLE quote_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  inventory_item_id UUID REFERENCES inventory_items(id),

  description     TEXT NOT NULL,
  quantity        INT NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2) NOT NULL,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(12,2),

  is_rental       BOOLEAN NOT NULL DEFAULT false,
  rental_months   INT,

  sort_order      INT NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qi_quote ON quote_items(quote_id);

ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quote_items_tenant_isolation" ON quote_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM quotes WHERE id = quote_id AND tenant_id = get_tenant_id())
  );
