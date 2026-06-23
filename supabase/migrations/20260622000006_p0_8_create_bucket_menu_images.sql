-- =====================================================
-- Fase 1 · P0-8 (parte bucket)
-- Crea bucket privado menu-images + políticas de acceso.
-- El frontend sube imágenes aquí en vez de base64 en DB.
-- =====================================================

BEGIN;

-- Crear bucket privado (las URLs firmadas dan acceso temporal)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  false,  -- privado: requiere URL firmada para acceder
  2097152, -- 2MB límite
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política: owners pueden subir/borrar SOLO imágenes de SU restaurante
-- El path debe ser: {restaurant_id}/... o {restaurant_id}/{menu_item_id}/...
DROP POLICY IF EXISTS "Owners can upload menu images" ON storage.objects;
CREATE POLICY "Owners can upload menu images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND public.is_my_restaurant(
      (storage.foldername(name))[1]::uuid
    )
  );

-- Política: owners pueden leer sus imágenes (además de via URL firmada)
DROP POLICY IF EXISTS "Owners can read menu images" ON storage.objects;
CREATE POLICY "Owners can read menu images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_my_restaurant(
      (storage.foldername(name))[1]::uuid
    )
  );

-- Política: owners pueden borrar SUS imágenes
DROP POLICY IF EXISTS "Owners can delete menu images" ON storage.objects;
CREATE POLICY "Owners can delete menu images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_my_restaurant(
      (storage.foldername(name))[1]::uuid
    )
  );

-- Anon puede leer vía URL firmada (la firma valida el acceso)
DROP POLICY IF EXISTS "Anon can read via signed URL" ON storage.objects;
CREATE POLICY "Anon can read via signed URL" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'menu-images');

COMMIT;

-- ─────────────────────────────────────────────────────
-- Script de migración de imágenes base64 existentes (M-2)
-- Ejecutar manualmente tras activar flag storage_only_images.
-- Ver: scripts/migrate_images.ts (por crear)
-- ─────────────────────────────────────────────────────
