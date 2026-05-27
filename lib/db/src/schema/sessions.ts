import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tableId: text("table_id").notNull(),
  tableName: text("table_name").notNull(),
  tableType: text("table_type").notNull(),
  openedById: text("opened_by_id").notNull(),
  openedByName: text("opened_by_name").notNull(),
  closedById: text("closed_by_id"),
  closedByName: text("closed_by_name"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  durationMinutes: integer("duration_minutes"),
  amount: integer("amount"),
  pricePerHour: integer("price_per_hour").notNull(),
  date: text("date").notNull(),
  syncedToSheets: boolean("synced_to_sheets").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
