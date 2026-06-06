-- ============================================================
-- 002: Profiles (extensión de auth.users)
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'technician'
    CHECK (role IN ('super_admin','tenant_admin','supervisor','technician','commercial')),
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_same_tenant" ON profiles
  FOR SELECT USING (tenant_id = auth.tenant_id());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Trigger updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := (NEW.raw_app_meta_data ->> 'tenant_id')::UUID;
  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO profiles (id, tenant_id, full_name, role)
    VALUES (
      NEW.id,
      v_tenant_id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      COALESCE(NEW.raw_app_meta_data ->> 'role', 'technician')
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
