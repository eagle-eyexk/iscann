import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { assetsTable } from "./assets";

export const scansTable = pgTable("scans", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull().default("__legacy_unowned__"),
  assetId: integer("asset_id").references(() => assetsTable.id, {
    onDelete: "set null",
  }),
  url: text("url").notNull(),
  finalUrl: text("final_url").notNull(),
  host: text("host").notNull(),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  durationMs: integer("duration_ms").notNull(),
  score: integer("score").notNull(),
  grade: text("grade").notNull(),
  statusCode: integer("status_code").notNull(),
  criticalCount: integer("critical_count").notNull().default(0),
  highCount: integer("high_count").notNull().default(0),
  mediumCount: integer("medium_count").notNull().default(0),
  lowCount: integer("low_count").notNull().default(0),
  infoCount: integer("info_count").notNull().default(0),
  report: jsonb("report").notNull(),
});

export type Scan = typeof scansTable.$inferSelect;
export type InsertScan = typeof scansTable.$inferInsert;
