#!/usr/bin/env bash
# =====================================================
# restore-db.sh — Restaurar DB desde backup
# Uso: ./scripts/restore-db.sh <backup-file>
# PELIGRO: sobrescribe la DB actual. Usar solo en staging.
# =====================================================
set -e

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Uso: $0 <backup-file>"
  echo "   Ejemplo: $0 ./backups/cmor_backup_20260622_120000.dump"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Archivo no encontrado: $BACKUP_FILE"
  exit 1
fi

# ─── Configuración ───
SUPABASE_DB_URL="${SUPABASE_DB_URL:-}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-clsgoknzyhkxtogxoshz}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$DB_PASSWORD" ] && [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: necesitas SUPABASE_DB_PASSWORD o SUPABASE_DB_URL"
  exit 1
fi

if [ -z "$SUPABASE_DB_URL" ]; then
  SUPABASE_DB_URL="postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres"
fi

# ─── Doble confirmación ───
echo "⚠️  PELIGRO: esto va a SOBREESCRIBIR la DB de $PROJECT_REF"
echo "   con el backup: $BACKUP_FILE"
echo ""
read -p "¿Estás seguro? Escribe 'RESTORE' en mayúsculas: " confirm
if [ "$confirm" != "RESTORE" ]; then
  echo "Operación cancelada."
  exit 0
fi

# ─── Restaurar ───
echo ""
echo "📥 Restaurando desde $BACKUP_FILE..."
pg_restore \
  --dbname="$SUPABASE_DB_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --verbose \
  "$BACKUP_FILE" 2>&1 | tail -50

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo ""
  echo "✅ Restauración completada"
else
  echo ""
  echo "⚠️  Restauración completada con warnings (revisar output arriba)"
fi

echo ""
echo "🔍 Verificando conteo de tablas principales..."
psql "$SUPABASE_DB_URL" -c "
  SELECT 'restaurants' as tabla, count(*) FROM restaurants
  UNION ALL
  SELECT 'orders', count(*) FROM orders
  UNION ALL
  SELECT 'menu_items', count(*) FROM menu_items
  UNION ALL
  SELECT 'restaurant_customers', count(*) FROM restaurant_customers
  UNION ALL
  SELECT 'auth.users', count(*) FROM auth.users
  UNION ALL
  SELECT 'consents', count(*) FROM consents;
"
