-- ============================================================
-- 011: Contracts UI support
-- ============================================================

-- Link work orders to contracts
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id);
CREATE INDEX IF NOT EXISTS idx_wo_contract ON work_orders(contract_id);

-- Account manager field for contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id);

-- Auto-number contracts: CON-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_year TEXT; v_seq INT;
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    v_year := to_char(now(), 'YYYY');
    SELECT COALESCE(MAX(
      CASE WHEN contract_number ~ ('^CON-' || v_year || '-\d+$')
           THEN (regexp_replace(contract_number, '^CON-\d{4}-', ''))::INT
           ELSE 0 END
    ), 0) + 1
      INTO v_seq FROM contracts WHERE tenant_id = NEW.tenant_id;
    NEW.contract_number := 'CON-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER contracts_auto_number
  BEFORE INSERT ON contracts
  FOR EACH ROW EXECUTE FUNCTION generate_contract_number();
