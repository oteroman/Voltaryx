-- Add datasheet_url to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS datasheet_url TEXT;

-- Storage bucket for product files (datasheets, manuals)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-files',
  'product-files',
  true,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone authenticated can upload
CREATE POLICY "auth_upload_product_files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-files');

-- RLS: public read
CREATE POLICY "public_read_product_files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-files');
