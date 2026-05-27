import { Router } from "express";
import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateUserBody,
  UpdateUserBody,
  UpdateUserParams,
  DeleteUserParams,
} from "@workspace/api-zod";
import { requireAuth, requireManager } from "../middlewares/auth";

const router = Router();

function safeUser(u: typeof usersTable.$inferSelect) {
  const { password: _pw, ...safe } = u;
  return { ...safe, createdAt: safe.createdAt.toISOString() };
}

router.get("/", requireAuth, async (_req, res) => {
  const rows = await db.select().from(usersTable).orderBy(usersTable.name);
  res.json(rows.map(safeUser));
});

router.post("/", requireManager, async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const [row] = await db
    .insert(usersTable)
    .values({ ...parsed.data, password: hashed })
    .returning();
  res.status(201).json(safeUser(row!));
});

router.patch("/:id", requireManager, async (req, res) => {
  const params = UpdateUserParams.safeParse(req.params);
  const body = UpdateUserBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Record<string, string> = {};
  if (body.data.name) updates["name"] = body.data.name;
  if (body.data.role) updates["role"] = body.data.role;
  if (body.data.shift) updates["shift"] = body.data.shift;
  if (body.data.password) updates["password"] = await bcrypt.hash(body.data.password, 10);

  const [row] = await db.update(usersTable).set(updates).where(eq(usersTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(safeUser(row));
});

router.delete("/:id", requireManager, async (req, res) => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.json({ success: true });
});

export { router as usersRouter };
