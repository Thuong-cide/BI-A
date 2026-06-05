#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Seed default users and settings if not present
psql "$DATABASE_URL" << 'SQL'
INSERT INTO users (id, username, password, name, role, shift, created_at)
VALUES 
  (gen_random_uuid()::text, 'quanly', '$2b$10$PoJ9pfqzriQAlI3HdgOzWe3gGOCCk/8XXWOugHeGNaWm5ZVYVi/6e', 'Quản Lý', 'quanly', 'Ca sáng', now()),
  (gen_random_uuid()::text, 'nhanvien', '$2b$10$mbkUksEbSBOle9u5i05CSuVIz7OeA8gp4HcW9zfC4BmO5suGwJ8w6', 'Nhân Viên', 'nhanvien', 'Ca tối', now())
ON CONFLICT (username) DO NOTHING;

INSERT INTO settings (key, value)
VALUES 
  ('price_pool', '50000'),
  ('price_libre', '40000'),
  ('price_snooker', '60000')
ON CONFLICT (key) DO NOTHING;
SQL
