-- ============================================================
-- 001: Tenants
-- ============================================================

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  logo_url      TEXT,
  primary_color TEXT NOT NULL DEFAULT '#C8FF00',
  plan          TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'pro', 'enterprise')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper: leer tenant_id del JWT (app_metadata). Disponible en RLS.
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
    ''
  )::UUID;
$$;

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
