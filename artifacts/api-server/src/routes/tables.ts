import { Router } from "express";
import { db, tablesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateTableBody,
  UpdateTableBody,
  UpdateTableParams,
  DeleteTableParams,
  GetTableParams,
} from "@workspace/api-zod";
import { requireAuth, requireManager, type AuthRequest } from "../middlewares/auth";

const router = Router();

function serializeTable(t: typeof tablesTable.$inferSelect) {
  return {
    ...t,
    startTime: t.startTime?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (_req, res) => {
  const rows = await db.select().from(tablesTable).orderBy(tablesTable.name);
  res.json(rows.map(serializeTable));
});

router.post("/", requireManager, async (req: AuthRequest, res) => {
  const parsed = CreateTableBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [row] = await db.insert(tablesTable).values(parsed.data).returning();
  res.status(201).json(serializeTable(row!));
});

router.get("/:id", requireAuth, async (req, res) => {
  const params = GetTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(tablesTable).where(eq(tablesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serializeTable(row));
});

router.patch("/:id", requireManager, async (req, res) => {
  const params = UpdateTableParams.safeParse(req.params);
  const body = UpdateTableBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Record<string, string> = {};
  if (body.data.name) updates["name"] = body.data.name;
  if (body.data.type) updates["type"] = body.data.type;
  const [row] = await db.update(tablesTable).set(updates).where(eq(tablesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serializeTable(row));
});

router.delete("/:id", requireManager, async (req, res) => {
  const params = DeleteTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(tablesTable).where(eq(tablesTable.id, params.data.id));
  res.json({ success: true });
});

export { router as tablesRouter };
