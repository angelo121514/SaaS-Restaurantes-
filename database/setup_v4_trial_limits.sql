-- database/setup_v4_trial_limits.sql
-- ---------------------------------------------------------------------
-- Trigger de base de datos para restringir la creación de platos
-- en locales con plan de prueba gratuito a un máximo de 30 platos.
-- =====================================================================

CREATE OR REPLACE FUNCTION check_menu_items_trial_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan TEXT;
  v_count INTEGER;
BEGIN
  -- Obtener el plan de suscripción del local
  SELECT subscription_plan INTO v_plan
  FROM public.restaurants
  WHERE id = NEW.restaurant_id;

  -- Solo aplicar el límite al plan free_trial
  IF v_plan = 'free_trial' THEN
    -- Contar el número de platos actuales del local
    SELECT COUNT(*) INTO v_count
    FROM public.menu_items
    WHERE restaurant_id = NEW.restaurant_id;

    IF v_count >= 30 THEN
      RAISE EXCEPTION 'Límite de platos excedido. El plan de prueba gratuito está limitado a un máximo de 30 platos. Por favor, actualiza tu plan en Configuración para agregar más platos.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_menu_items_trial_limit ON public.menu_items;
CREATE TRIGGER trg_check_menu_items_trial_limit
BEFORE INSERT ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION check_menu_items_trial_limit();
