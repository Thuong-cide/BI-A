import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../lib/db/src/schema/index.ts";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const { usersTable, settingsTable } = schema;

async function seed() {
  console.log("Seeding database...");

  const quanlyHash = await bcrypt.hash("admin123", 10);
  const nhanvienHash = await bcrypt.hash("nhanvien123", 10);

  await db.insert(usersTable).values([
    {
      username: "quanly",
      password: quanlyHash,
      name: "Quản Lý",
      role: "quanly",
      shift: "Ca sáng",
    },
    {
      username: "nhanvien",
      password: nhanvienHash,
      name: "Nhân Viên",
      role: "nhanvien",
      shift: "Ca tối",
    },
  ]).onConflictDoNothing();

  await db.insert(settingsTable).values([
    { key: "price_pool", value: "50000" },
    { key: "price_libre", value: "40000" },
    { key: "price_snooker", value: "60000" },
  ]).onConflictDoNothing();

  console.log("✅ Seed complete.");
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
