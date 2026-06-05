import { Router } from "express";
import { db, sessionsTable } from "@workspace/db";
import { gte, lte, and, sum, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

router.get("/revenue", requireAuth, async (req, res) => {
  const { from, to } = req.query as Record<string, string>;
  if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    res.status(400).json({ error: "Invalid query. Provide from and to as YYYY-MM-DD." });
    return;
  }

  const rows = await db
    .select({
      date: sessionsTable.date,
      revenue: sum(sessionsTable.amount),
      sessionCount: count(),
      extraRevenue: sum(sessionsTable.extraAmount),
    })
    .from(sessionsTable)
    .where(and(gte(sessionsTable.date, from), lte(sessionsTable.date, to)))
    .groupBy(sessionsTable.date)
    .orderBy(sessionsTable.date);

  const data = rows.map((r) => {
    const revenue = Number(r.revenue ?? 0);
    const extraRevenue = Number(r.extraRevenue ?? 0);
    return {
      date: r.date,
      revenue,
      sessionCount: Number(r.sessionCount ?? 0),
      extraRevenue,
      billiardRevenue: revenue - extraRevenue,
    };
  });

  const totalRevenue = data.reduce((acc, d) => acc + d.revenue, 0);
  const totalSessions = data.reduce((acc, d) => acc + d.sessionCount, 0);
  const totalExtraRevenue = data.reduce((acc, d) => acc + d.extraRevenue, 0);

  res.json({ data, totalRevenue, totalSessions, totalExtraRevenue });
});

export { router as reportRouter };
