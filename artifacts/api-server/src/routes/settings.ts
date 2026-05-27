import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpsertSettingBody, UpsertSettingParams } from "@workspace/api-zod";
import { requireAuth, requireManager } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const rows = await db.select().from(settingsTable).orderBy(settingsTable.key);
  res.json(rows);
});

router.put("/:key", requireManager, async (req, res) => {
  const params = UpsertSettingParams.safeParse(req.params);
  const body = UpsertSettingBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [row] = await db
    .insert(settingsTable)
    .values({ key: params.data.key, value: body.data.value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: body.data.value } })
    .returning();
  res.json(row!);
});

export { router as settingsRouter };
