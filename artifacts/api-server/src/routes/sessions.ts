import { Router } from "express";
import { db, tablesTable, sessionsTable, usersTable, settingsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  OpenSessionBody,
  CloseSessionBody,
  GetSessionsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

function serializeTable(t: typeof tablesTable.$inferSelect) {
  return {
    ...t,
    startTime: t.startTime?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

function serializeSession(s: typeof sessionsTable.$inferSelect) {
  return {
    ...s,
    startTime: s.startTime.toISOString(),
    endTime: s.endTime?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.post("/open", requireAuth, async (req: AuthRequest, res) => {
  const parsed = OpenSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { tableId, userId, pricePerHour } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, tableId)).limit(1);
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  if (table.status === "active") {
    res.status(400).json({ error: "Table is already active" });
    return;
  }

  const [updatedTable] = await db
    .update(tablesTable)
    .set({
      status: "active",
      startTime: new Date(),
      openedById: userId,
      openedByName: user.name,
    })
    .where(eq(tablesTable.id, tableId))
    .returning();

  const io = req.app.get("io");
  if (io) io.emit("table:updated", serializeTable(updatedTable!));

  res.json({ success: true, table: serializeTable(updatedTable!) });
});

router.post("/close", requireAuth, async (req: AuthRequest, res) => {
  const parsed = CloseSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { tableId, userId } = parsed.data;

  const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, tableId)).limit(1);
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  if (table.status !== "active" || !table.startTime) {
    res.status(400).json({ error: "Table is not active" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Get price from settings if not set
  const typeKey = `price_${table.type.toLowerCase()}`;
  const [setting] = await db.select().from(settingsTable).where(eq(settingsTable.key, typeKey)).limit(1);
  const pricePerHour = setting ? parseInt(setting.value, 10) : 50000;

  const endTime = new Date();
  const diffMs = endTime.getTime() - table.startTime.getTime();
  const durationMinutes = Math.max(1, Math.round(diffMs / 1000 / 60));
  const amount = Math.round((pricePerHour / 60) * durationMinutes);

  const date = endTime.toLocaleDateString("vi-VN");

  const [session] = await db
    .insert(sessionsTable)
    .values({
      tableId,
      tableName: table.name,
      tableType: table.type,
      openedById: table.openedById ?? userId,
      openedByName: table.openedByName ?? user.name,
      closedById: userId,
      closedByName: user.name,
      startTime: table.startTime,
      endTime,
      durationMinutes,
      amount,
      pricePerHour,
      date,
      syncedToSheets: false,
    })
    .returning();

  const [updatedTable] = await db
    .update(tablesTable)
    .set({ status: "empty", startTime: null, openedById: null, openedByName: null })
    .where(eq(tablesTable.id, tableId))
    .returning();

  const io = req.app.get("io");
  if (io) {
    io.emit("table:updated", serializeTable(updatedTable!));
    io.emit("session:created", serializeSession(session!));
  }

  res.json({ success: true, session: serializeSession(session!), table: serializeTable(updatedTable!) });
});

router.get("/", requireAuth, async (req, res) => {
  const parsed = GetSessionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  const { date, userId, tableId } = parsed.data;

  const conditions = [];
  if (date) conditions.push(eq(sessionsTable.date, date));
  if (userId) conditions.push(eq(sessionsTable.openedById, userId));
  if (tableId) conditions.push(eq(sessionsTable.tableId, tableId));

  const rows = await db
    .select()
    .from(sessionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sessionsTable.createdAt));

  res.json(rows.map(serializeSession));
});

export { router as sessionsRouter };
