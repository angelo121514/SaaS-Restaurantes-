#!/usr/bin/env bash
# =====================================================
# backup-db.sh — Backup completo de la DB de Supabase
# Uso: npm run backup-db
# Requiere: pg_dump instalado + variables de entorno
# =====================================================
set -e

# ─── Configuración ───
SUPABASE_DB_URL="${SUPABASE_DB_URL:-}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-clsgoknzyhkxtogxoshz}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$DB_PASSWORD" ] && [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: necesitas configurar SUPABASE_DB_PASSWORD o SUPABASE_DB_URL"
  echo ""
  echo "   Opción A: Exportar SUPABASE_DB_URL"
  echo "     export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.$PROJECT_REF.supabase.co:5432/postgres'"
  echo ""
  echo "   Opción B: Exportar SUPABASE_DB_PASSWORD (asume usuario postgres)"
  echo "     export SUPABASE_DB_PASSWORD='[PASSWORD]'"
  exit 1
fi

if [ -z "$SUPABASE_DB_URL" ]; then
  SUPABASE_DB_URL="postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres"
fi

# ─── Crear directorio de backups ───
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/cmor_backup_${TIMESTAMP}.dump"
BACKUP_AUTH_FILE="$BACKUP_DIR/cmor_auth_users_${TIMESTAMP}.sql"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  💾 Backup de CMOR FLOW — $(date +'%Y-%m-%d %H:%M:%S')           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ─── Backup completo (custom format, comprimido) ───
echo "📥 Backup completo de la DB..."
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILE"

if [ $? -ne 0 ]; then
  echo "❌ Error en pg_dump"
  exit 1
fi

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup completo: $BACKUP_FILE ($FILESIZE)"

# ─── Export separado de auth.users (para restore parcial) ───
echo ""
echo "📥 Export de auth.users..."
pg_dump "$SUPABASE_DB_URL" \
  --table=auth.users \
  --data-only \
  --inserts \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_AUTH_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Auth export: $BACKUP_AUTH_FILE"
fi

# ─── Verificación ───
echo ""
echo "🔍 Verificando integridad del backup..."
pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Backup verificable (pg_restore --list OK)"
else
  echo "⚠️  Backup podría estar corrupto — verificar manualmente"
fi

# ─── Limpiar backups antiguos (mantener 7 días) ───
echo ""
echo "🧹 Limpiando backups > 7 días..."
find "$BACKUP_DIR" -name "cmor_backup_*.dump" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "cmor_auth_users_*.sql" -mtime +7 -delete 2>/dev/null || true

# ─── Resumen ───
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Backup completado                                     ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "  Archivo:    $BACKUP_FILE"
echo "  Tamaño:     $FILESIZE"
echo "  Auth:       $BACKUP_AUTH_FILE"
echo "                                                          ║"
echo "  Para restaurar:                                          ║"
echo "    ./scripts/restore-db.sh $BACKUP_FILE                  ║"
echo "                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"

# ─── Subir a almacenamiento durable (opcional, requiere aws-cli) ───
if command -v aws &> /dev/null && [ -n "$BACKUP_S3_BUCKET" ]; then
  echo ""
  echo "📤 Subiendo a S3: $BACKUP_S3_BUCKET"
  S3_KEY="backups/$(date +%Y/%m/%d)/cmor_backup_${TIMESTAMP}.dump"
  aws s3 cp "$BACKUP_FILE" "s3://$BACKUP_S3_BUCKET/$S3_KEY" --sse AES256
  echo "✅ Subido: s3://$BACKUP_S3_BUCKET/$S3_KEY"
fi
