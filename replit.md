# Quản Lý Bàn Bi-a

Phần mềm quản lý phòng bi-a — theo dõi trạng thái bàn theo thời gian thực, tính tiền tự động, lịch sử phiên chơi, và phân quyền nhân viên/quản lý.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/billiards run dev` — run the frontend (port 21217)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `JWT_SECRET` — JWT signing secret (defaults to "billiards-secret-key" in dev)

## Default Accounts

| Vai trò   | Username   | Password      |
|-----------|------------|---------------|
| Quản lý   | quanly     | admin123      |
| Nhân viên | nhanvien   | nhanvien123   |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Socket.IO (real-time table updates)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind CSS (mobile-first)
- Auth: JWT (localStorage token)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB schema (users, tables, sessions, settings)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware
- `artifacts/billiards/src/` — React frontend

## Architecture decisions

- Socket.IO path is `/api/socket.io` so it routes through the shared proxy
- Prices stored in `settings` table as key `price_pool`, `price_libre`, `price_snooker` (value in VND/hour)
- JWT tokens are stored in localStorage and sent as `Authorization: Bearer <token>`
- Sessions are immutable once closed; `syncedToSheets` flag tracks Google Sheets sync status
- All table state changes (open/close) emit `table:updated` socket events to all connected clients

## Product

- Dashboard: Real-time table cards showing status, elapsed time, estimated bill
- Open/Close tables with automatic billing calculation
- Role-based access: nhân viên can open/close, quản lý has full admin
- History: filter by date, table, or staff
- Admin: manage tables, users, and price settings

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run codegen after editing `lib/api-spec/openapi.yaml`
- Socket.IO is on path `/api/socket.io` — must be listed in artifact.toml paths
- `pnpm --filter @workspace/db run push-force` if column conflicts during schema changes
