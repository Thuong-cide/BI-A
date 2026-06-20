#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────
#  Quản Lý Bàn Bi-a — Script cài đặt cho máy THUONG (Ubuntu)
#  PostgreSQL: container postgres_db / network postgres-stack_default
# ─────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_step()  { echo -e "\n${BLUE}▶ $1${NC}"; }
print_ok()    { echo -e "${GREEN}✅ $1${NC}"; }
print_warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
print_info()  { echo -e "${CYAN}ℹ️  $1${NC}"; }

# ── Cấu hình PostgreSQL (đã xác định từ hệ thống) ────────────
PG_CONTAINER="postgres_db"
PG_NETWORK="postgres-stack_default"
PG_HOST="postgres_db"
PG_PORT="5432"
PG_USER="postgres"
PG_DB="billiards"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   QUẢN LÝ BÀN BI-A — Cài đặt tự động Ubuntu    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
print_info "PostgreSQL: container=${PG_CONTAINER} | network=${PG_NETWORK}"

# ── 1. Kiểm tra Docker ───────────────────────────────────────
print_step "Kiểm tra Docker..."
if ! docker info &>/dev/null; then
  print_error "Docker chưa chạy hoặc thiếu quyền. Thử: sudo usermod -aG docker \$USER"
fi

COMPOSE_CMD="docker compose"
if ! docker compose version &>/dev/null 2>&1; then
  if command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
  else
    print_error "Cần Docker Compose. Cài: sudo apt-get install docker-compose-plugin"
  fi
fi
print_ok "Docker OK — dùng: $COMPOSE_CMD"

# ── 2. Kiểm tra container postgres_db ───────────────────────
print_step "Kiểm tra container PostgreSQL..."
if ! docker inspect "$PG_CONTAINER" &>/dev/null; then
  print_error "Không tìm thấy container '$PG_CONTAINER'. Hãy đảm bảo nó đang chạy."
fi
print_ok "Container '$PG_CONTAINER' đang chạy."

# ── 3. Nhập mật khẩu PostgreSQL ──────────────────────────────
print_step "Nhập mật khẩu PostgreSQL..."
echo -e "  ${CYAN}Mật khẩu của user '${PG_USER}' trong container '${PG_CONTAINER}':${NC}"
read -rsp "  Password: " PG_PASS
echo ""

if [ -z "$PG_PASS" ]; then
  print_error "Mật khẩu không được để trống."
fi

DB_URL="postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}"

# ── 4. Kiểm tra kết nối qua Docker network ──────────────────
print_step "Kiểm tra kết nối tới PostgreSQL..."
if docker run --rm --network "$PG_NETWORK" postgres:16-alpine \
  pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" &>/dev/null; then
  print_ok "Kết nối tới PostgreSQL thành công."
else
  print_error "Không kết nối được PostgreSQL. Kiểm tra lại mật khẩu hoặc container."
fi

# ── 5. Tạo database 'billiards' nếu chưa có ─────────────────
print_step "Kiểm tra database '$PG_DB'..."
DB_EXISTS=$(docker run --rm --network "$PG_NETWORK" \
  -e PGPASSWORD="$PG_PASS" postgres:16-alpine \
  psql -h "$PG_HOST" -U "$PG_USER" -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${PG_DB}';" 2>/dev/null || true)

if [ "$DB_EXISTS" = "1" ]; then
  print_ok "Database '$PG_DB' đã tồn tại."
else
  print_info "Đang tạo database '$PG_DB'..."
  docker run --rm --network "$PG_NETWORK" \
    -e PGPASSWORD="$PG_PASS" postgres:16-alpine \
    psql -h "$PG_HOST" -U "$PG_USER" \
    -c "CREATE DATABASE ${PG_DB};"
  print_ok "Đã tạo database '$PG_DB'."
fi

# ── 6. Tạo file .env ─────────────────────────────────────────
print_step "Tạo file .env..."
JWT=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | head -c 64)

cat > .env << EOF
POSTGRES_PASSWORD=${PG_PASS}
JWT_SECRET=${JWT}
APP_PORT=3000
EOF

print_ok "Đã tạo .env với JWT_SECRET ngẫu nhiên."

# ── 7. Tạo docker-compose.override.yml ──────────────────────
print_step "Tạo cấu hình kết nối PostgreSQL..."
cat > docker-compose.override.yml << EOF
services:
  postgres:
    profiles:
      - disabled

  migrate:
    environment:
      DATABASE_URL: "${DB_URL}"
    networks:
      - pg_network

  api:
    environment:
      DATABASE_URL: "${DB_URL}"
    networks:
      - pg_network
      - default

  frontend:
    networks:
      - default

networks:
  pg_network:
    external: true
    name: ${PG_NETWORK}
EOF

print_ok "Đã tạo docker-compose.override.yml."

# ── 8. Dừng container cũ (nếu có) ───────────────────────────
print_step "Dừng các container cũ (nếu có)..."
$COMPOSE_CMD down --remove-orphans 2>/dev/null && print_ok "Đã dừng." || true

# ── 9. Build images ──────────────────────────────────────────
print_step "Build Docker images (lần đầu mất 5–10 phút)..."
$COMPOSE_CMD build

# ── 10. Khởi động ────────────────────────────────────────────
print_step "Khởi động tất cả dịch vụ..."
$COMPOSE_CMD up -d

# ── 11. Chờ API sẵn sàng ─────────────────────────────────────
print_step "Chờ API khởi động (tối đa 90 giây)..."
MAX=90
COUNT=0
until curl -sf "http://localhost:8080/api/healthz" &>/dev/null 2>&1 || \
      wget -qO- "http://localhost:8080/api/healthz" &>/dev/null 2>&1; do
  sleep 2
  COUNT=$((COUNT + 2))
  echo -n "."
  if [ $COUNT -ge $MAX ]; then
    echo ""
    echo ""
    print_warn "API chưa phản hồi. Xem log để kiểm tra:"
    echo -e "  ${YELLOW}$COMPOSE_CMD logs migrate${NC}"
    echo -e "  ${YELLOW}$COMPOSE_CMD logs api${NC}"
    exit 1
  fi
done
echo ""
print_ok "API đã sẵn sàng!"

# ── 12. Hoàn tất ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          APP ĐÃ CHẠY THÀNH CÔNG!                ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  🌐  http://localhost:3000                      ${GREEN}║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  👤  quanly   / admin123                       ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  👤  nhanvien / nhanvien123                    ${GREEN}║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  📋  Lệnh hữu ích:                            ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    Dừng:    ${YELLOW}$COMPOSE_CMD down${NC}                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    Log:     ${YELLOW}$COMPOSE_CMD logs -f${NC}             ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    Bật lại: ${YELLOW}$COMPOSE_CMD up -d${NC}              ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
