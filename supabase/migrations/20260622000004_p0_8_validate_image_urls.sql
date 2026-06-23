-- =====================================================
-- Fase 1 · P0-8 (parte DB)
-- Trigger que valida image_urls: solo URLs http(s)://
-- y máx 3 elementos. CHECK de tamaño total < 5KB.
-- =====================================================

BEGIN;

-- CHECK de tamaño
ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_image_urls_size;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_image_urls_size
  CHECK (octet_length(image_urls::text) < 5000);

-- Función validadora
CREATE OR REPLACE FUNCTION public.validate_image_urls()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_url text;
  v_count int;
BEGIN
  IF NEW.image_urls IS NULL THEN
    RETURN NEW;
  END IF;

  -- Max 3 imágenes por item
  SELECT jsonb_array_length(NEW.image_urls) INTO v_count;
  IF v_count > 3 THEN
    RAISE EXCEPTION 'Max 3 images per menu item, got %', v_count
      USING ERRCODE = '23514';
  END IF;

  -- Cada elemento debe ser URL http(s)://
  FOR v_url IN SELECT jsonb_array_elements_text(NEW.image_urls) LOOP
    IF v_url !~ '^https?://[a-zA-Z0-9]' THEN
      RAISE EXCEPTION 'Invalid image URL (must start with http:// or https://): %', v_url
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_image_urls ON public.menu_items;
CREATE TRIGGER trg_validate_image_urls
  BEFORE INSERT OR UPDATE OF image_urls ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_image_urls();

COMMIT;
