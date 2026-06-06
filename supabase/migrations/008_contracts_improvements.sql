-- ============================================================
-- 008: Contracts — account_manager + auto contract_number
-- ============================================================

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_contracts_acct_mgr ON contracts(account_manager_id);

-- Auto contract number: CT-YYYYMM-NNNN
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_prefix TEXT;
  v_seq    INT;
BEGIN
  v_prefix := 'CT-' || to_char(now(), 'YYYYMM') || '-';
  SELECT COALESCE(MAX(NULLIF(regexp_replace(contract_number, '^CT-\d{6}-', ''), '')::INT), 0) + 1
    INTO v_seq
    FROM contracts
   WHERE tenant_id = NEW.tenant_id
     AND contract_number LIKE v_prefix || '%';
  NEW.contract_number := v_prefix || lpad(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER contracts_contract_number
  BEFORE INSERT ON contracts
  FOR EACH ROW
  WHEN (NEW.contract_number IS NULL OR NEW.contract_number = '')
  EXECUTE FUNCTION generate_contract_number();
