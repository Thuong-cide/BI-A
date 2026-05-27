import { Router } from "express";
import { db, tablesTable, sessionsTable } from "@workspace/db";
import { eq, sum, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/summary", requireAuth, async (_req, res) => {
  const today = new Date().toLocaleDateString("vi-VN");

  const [tableStats] = await db
    .select({
      total: count(),
      active: count(eq(tablesTable.status, "active")),
    })
    .from(tablesTable);

  const activeCount = await db
    .select({ cnt: count() })
    .from(tablesTable)
    .where(eq(tablesTable.status, "active"));

  const todaySessions = await db
    .select({
      cnt: count(),
      totalRevenue: sum(sessionsTable.amount),
      totalMinutes: sum(sessionsTable.durationMinutes),
    })
    .from(sessionsTable)
    .where(eq(sessionsTable.date, today));

  res.json({
    activeTablesCount: Number(activeCount[0]?.cnt ?? 0),
    totalTablesCount: Number(tableStats?.total ?? 0),
    todayRevenue: Number(todaySessions[0]?.totalRevenue ?? 0),
    todaySessionsCount: Number(todaySessions[0]?.cnt ?? 0),
    todayTotalMinutes: Number(todaySessions[0]?.totalMinutes ?? 0),
  });
});

export { router as dashboardRouter };
