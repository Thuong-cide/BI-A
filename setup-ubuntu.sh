#!/bin/bash
set -e

# ─────────────────────────────────────────────
#  Quản Lý Bàn Bi-a — Script cài đặt Ubuntu
# ─────────────────────────────────────────────

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

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    QUẢN LÝ BÀN BI-A — Ubuntu Docker Setup   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Kiểm tra Docker ───────────────────────────────────
print_step "Kiểm tra Docker..."

if ! command -v docker &>/dev/null; then
  print_error "Docker chưa được cài. Cài bằng lệnh:\n  curl -fsSL https://get.docker.com | sh"
fi

if ! docker info &>/dev/null; then
  print_warn "Không kết nối được Docker daemon. Thử chạy: sudo usermod -aG docker \$USER rồi đăng xuất/đăng nhập lại."
  print_warn "Hoặc chạy script này bằng: sudo $0"
  exit 1
fi

DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
print_ok "Docker $DOCKER_VERSION sẵn sàng."

# ── 2. Kiểm tra Docker Compose ───────────────────────────
if docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
  print_warn "Đang dùng docker-compose cũ. Khuyến nghị cập nhật lên Docker Compose v2."
else
  print_error "Cần Docker Compose. Cài bằng lệnh:\n  sudo apt-get install docker-compose-plugin"
fi
print_ok "Docker Compose OK ($COMPOSE_CMD)."

# ── 3. Tạo file .env nếu chưa có ─────────────────────────
print_step "Cấu hình môi trường..."

if [ ! -f .env ]; then
  cp .env.example .env

  # Tự sinh JWT_SECRET ngẫu nhiên
  if command -v openssl &>/dev/null; then
    JWT=$(openssl rand -hex 32)
    sed -i "s/billiards-secret-change-me-to-something-random/$JWT/" .env
    print_ok "Đã tạo JWT_SECRET ngẫu nhiên."
  else
    print_warn "Không tìm thấy openssl. Vui lòng tự đặt JWT_SECRET trong file .env"
  fi
else
  print_ok "File .env đã tồn tại — giữ nguyên."
fi

# ── 4. Chọn chế độ PostgreSQL ─────────────────────────────
print_step "Cấu hình PostgreSQL..."
echo ""
echo -e "  ${CYAN}Bạn có PostgreSQL đang chạy sẵn trong Docker không?${NC}"
echo -e "  ${YELLOW}[1]${NC} Dùng PostgreSQL của tôi đang chạy sẵn"
echo -e "  ${YELLOW}[2]${NC} Tự động tạo PostgreSQL mới trong docker-compose"
echo ""
read -rp "  Chọn (1 hoặc 2, mặc định là 2): " PG_CHOICE
PG_CHOICE=${PG_CHOICE:-2}

USE_EXTERNAL_PG=false
EXTERNAL_DB_URL=""

if [ "$PG_CHOICE" = "1" ]; then
  USE_EXTERNAL_PG=true
  echo ""
  print_info "Nhập thông tin kết nối PostgreSQL của bạn:"
  read -rp "  Host (ví dụ: localhost hoặc tên container): " PG_HOST
  read -rp "  Port (mặc định: 5432): " PG_PORT
  PG_PORT=${PG_PORT:-5432}
  read -rp "  Database name: " PG_DB
  read -rp "  Username: " PG_USER
  read -rsp "  Password: " PG_PASS
  echo ""

  EXTERNAL_DB_URL="postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}"

  # Kiểm tra kết nối — tự phát hiện Docker network nếu host là tên container
  print_info "Kiểm tra kết nối tới PostgreSQL..."
  DOCKER_NETWORK=""

  # Kiểm tra xem PG_HOST có phải là tên container đang chạy không
  if docker inspect "$PG_HOST" &>/dev/null; then
    # Lấy network đầu tiên của container đó
    DOCKER_NETWORK=$(docker inspect "$PG_HOST" \
      --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' \
      | head -1 | tr -d '[:space:]')
    print_info "Phát hiện container '$PG_HOST' đang dùng network: $DOCKER_NETWORK"
  fi

  if [ -n "$DOCKER_NETWORK" ]; then
    # Ping qua Docker network nội bộ
    if docker run --rm --network "$DOCKER_NETWORK" postgres:16-alpine \
      pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" &>/dev/null; then
      print_ok "Kết nối PostgreSQL thành công (qua network: $DOCKER_NETWORK)."
    else
      print_warn "Không ping được PostgreSQL. Kiểm tra lại user/password/database."
      print_warn "Tiếp tục — app sẽ báo lỗi khi khởi động nếu DB không đúng."
    fi
  else
    # Host là localhost hoặc IP — dùng host network
    if docker run --rm --network host postgres:16-alpine \
      pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" &>/dev/null; then
      print_ok "Kết nối PostgreSQL thành công."
    else
      print_warn "Không ping được PostgreSQL tại $PG_HOST:$PG_PORT."
      print_warn "Tiếp tục — app sẽ báo lỗi khi khởi động nếu DB không đúng."
    fi
  fi
fi

# ── 5. Tạo docker-compose override nếu dùng PostgreSQL ngoài ──
if [ "$USE_EXTERNAL_PG" = true ]; then
  print_step "Tạo cấu hình dùng PostgreSQL ngoài..."

  # Xác định cách kết nối network cho các service
  if [ -n "$DOCKER_NETWORK" ]; then
    # PostgreSQL là container Docker — join cùng network
    cat > docker-compose.override.yml << EOF
services:
  postgres:
    profiles:
      - disabled

  migrate:
    environment:
      DATABASE_URL: "${EXTERNAL_DB_URL}"
    networks:
      - pg_network

  api:
    environment:
      DATABASE_URL: "${EXTERNAL_DB_URL}"
    networks:
      - pg_network
      - default

  frontend:
    networks:
      - default

networks:
  pg_network:
    external: true
    name: ${DOCKER_NETWORK}
EOF
    print_ok "Đã cấu hình join Docker network '${DOCKER_NETWORK}' của PostgreSQL."
  else
    # PostgreSQL trên host (localhost/IP) — dùng host network
    cat > docker-compose.override.yml << EOF
services:
  postgres:
    profiles:
      - disabled

  migrate:
    environment:
      DATABASE_URL: "${EXTERNAL_DB_URL}"
    network_mode: host

  api:
    environment:
      DATABASE_URL: "${EXTERNAL_DB_URL}"
    network_mode: host

  frontend:
    network_mode: host
EOF
    print_ok "Đã cấu hình dùng host network để kết nối PostgreSQL tại $PG_HOST."
  fi
else
  # Xóa override cũ nếu có
  rm -f docker-compose.override.yml
  print_ok "Sẽ tạo PostgreSQL mới trong docker-compose."
fi

# ── 6. Đặt cổng ứng dụng ─────────────────────────────────
print_step "Cấu hình cổng ứng dụng..."

CURRENT_PORT=$(grep '^APP_PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '[:space:]')
CURRENT_PORT=${CURRENT_PORT:-3000}

read -rp "  Cổng chạy app (mặc định: $CURRENT_PORT): " NEW_PORT
NEW_PORT=${NEW_PORT:-$CURRENT_PORT}

if [ "$NEW_PORT" != "$CURRENT_PORT" ]; then
  if grep -q '^APP_PORT=' .env; then
    sed -i "s/^APP_PORT=.*/APP_PORT=$NEW_PORT/" .env
  else
    echo "APP_PORT=$NEW_PORT" >> .env
  fi
fi

print_ok "Cổng ứng dụng: $NEW_PORT"

# ── 7. Dừng container cũ ─────────────────────────────────
print_step "Dừng các container cũ (nếu có)..."
$COMPOSE_CMD down --remove-orphans 2>/dev/null && print_ok "Đã dừng." || true

# ── 8. Build Docker images ───────────────────────────────
print_step "Build Docker images (lần đầu mất 5–10 phút tùy tốc độ mạng)..."
$COMPOSE_CMD build

# ── 9. Khởi động ─────────────────────────────────────────
print_step "Khởi động tất cả dịch vụ..."
$COMPOSE_CMD up -d

# ── 10. Chờ API sẵn sàng ─────────────────────────────────
print_step "Chờ API khởi động (tối đa 90 giây)..."
MAX=90
COUNT=0
API_HOST="localhost"

until curl -sf "http://${API_HOST}:8080/api/healthz" &>/dev/null || \
      wget -qO- "http://${API_HOST}:8080/api/healthz" &>/dev/null 2>&1; do
  sleep 2
  COUNT=$((COUNT + 2))
  echo -n "."
  if [ $COUNT -ge $MAX ]; then
    echo ""
    print_error "API không phản hồi sau ${MAX}s. Xem log:\n  $COMPOSE_CMD logs api\n  $COMPOSE_CMD logs migrate"
  fi
done
echo ""
print_ok "API đã sẵn sàng!"

# ── 11. Kiểm tra frontend ────────────────────────────────
sleep 3
if curl -sf "http://localhost:${NEW_PORT}" &>/dev/null || \
   wget -qO- "http://localhost:${NEW_PORT}" &>/dev/null 2>&1; then
  print_ok "Frontend đang chạy!"
else
  print_warn "Frontend có thể chưa sẵn sàng. Chờ thêm 10 giây..."
  sleep 10
fi

# ── 12. Hoàn tất ─────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           APP ĐÃ CHẠY THÀNH CÔNG!           ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  🌐  http://localhost:${NEW_PORT}                     ${GREEN}║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  👤  quanly   / admin123                   ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  👤  nhanvien / nhanvien123                ${GREEN}║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  📋  Lệnh hữu ích:                        ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Dừng app:    ${YELLOW}$COMPOSE_CMD down${NC}         ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Xem log:     ${YELLOW}$COMPOSE_CMD logs -f${NC}      ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Khởi động lại: ${YELLOW}$COMPOSE_CMD up -d${NC}      ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
