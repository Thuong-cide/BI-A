#!/bin/bash
set -e

# ─────────────────────────────────────────────
#  Quản Lý Bàn Bi-a — Script cài đặt macOS
# ─────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step()  { echo -e "\n${BLUE}▶ $1${NC}"; }
print_ok()    { echo -e "${GREEN}✅ $1${NC}"; }
print_warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     QUẢN LÝ BÀN BI-A — Docker Setup   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Kiểm tra Docker ───────────────────────
print_step "Kiểm tra Docker Desktop..."

if ! command -v docker &>/dev/null; then
  print_error "Docker chưa được cài. Tải tại: https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info &>/dev/null; then
  print_error "Docker Desktop chưa khởi động. Mở Docker Desktop rồi chạy lại script."
  exit 1
fi

DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
print_ok "Docker $DOCKER_VERSION đang chạy."

# ── 2. Kiểm tra docker compose ───────────────
if ! docker compose version &>/dev/null; then
  print_error "Cần Docker Compose v2+. Hãy cập nhật Docker Desktop."
  exit 1
fi
print_ok "Docker Compose OK."

# ── 3. Tạo file .env nếu chưa có ────────────
print_step "Cấu hình môi trường..."

if [ ! -f .env ]; then
  cp .env.example .env

  # Tự sinh JWT_SECRET ngẫu nhiên
  if command -v openssl &>/dev/null; then
    JWT=$(openssl rand -hex 32)
    sed -i '' "s/billiards-secret-change-me-to-something-random/$JWT/" .env
    print_ok "Đã tạo JWT_SECRET ngẫu nhiên."
  fi

  print_warn "File .env đã được tạo. Bạn có thể chỉnh APP_PORT nếu muốn đổi cổng."
else
  print_ok "File .env đã tồn tại — giữ nguyên."
fi

# ── 4. Đọc APP_PORT để hiện URL ─────────────
APP_PORT=$(grep '^APP_PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '[:space:]')
APP_PORT=${APP_PORT:-3000}

# ── 5. Dừng container cũ (nếu có) ───────────
print_step "Dừng các container cũ (nếu có)..."
docker compose down --remove-orphans 2>/dev/null && print_ok "Đã dừng." || true

# ── 6. Build và khởi động ────────────────────
print_step "Build Docker images (lần đầu mất 3–5 phút)..."
docker compose build

print_step "Khởi động tất cả dịch vụ..."
docker compose up -d

# ── 7. Chờ API sẵn sàng ─────────────────────
print_step "Chờ API khởi động..."
MAX=60
COUNT=0
until docker compose exec -T api wget -qO- http://localhost:8080/api/healthz &>/dev/null; do
  sleep 2
  COUNT=$((COUNT + 2))
  echo -n "."
  if [ $COUNT -ge $MAX ]; then
    echo ""
    print_error "API không phản hồi sau ${MAX}s. Xem log: docker compose logs api"
    exit 1
  fi
done
echo ""

# ── 8. Hoàn tất ──────────────────────────────
print_ok "Tất cả dịch vụ đã sẵn sàng!"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         APP ĐÃ CHẠY THÀNH CÔNG!        ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  🌐  http://localhost:${APP_PORT}               ${GREEN}║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  👤  quanly   / admin123               ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  👤  nhanvien / nhanvien123             ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Dừng app:    ${YELLOW}docker compose down${NC}"
echo -e "  Xem log:     ${YELLOW}docker compose logs -f${NC}"
echo -e "  Khởi động lại: ${YELLOW}docker compose up -d${NC}"
echo ""
