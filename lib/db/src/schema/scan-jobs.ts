import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { assetsTable } from "./assets";
import { scansTable } from "./scans";

export const scanJobStatusEnum = pgEnum("scan_job_status", [
  "queued",
  "starting",
  "running",
  "finalizing",
  "completed",
  "failed",
  "cancelled",
  "timed_out",
]);

export const scanJobsTable = pgTable(
  "scan_jobs",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    assetId: integer("asset_id")
      .notNull()
      .references(() => assetsTable.id, { onDelete: "cascade" }),
    scanId: integer("scan_id").references(() => scansTable.id, {
      onDelete: "set null",
    }),
    status: scanJobStatusEnum("status").notNull().default("queued"),
    progress: integer("progress"),
    stage: text("stage"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelRequestedAt: timestamp("cancel_requested_at", { withTimezone: true }),
  },
  (table) => [
    index("scan_jobs_status_created_at_idx").on(table.status, table.createdAt),
    index("scan_jobs_owner_created_at_idx").on(table.ownerId, table.createdAt),
    uniqueIndex("scan_jobs_active_asset_unique")
      .on(table.ownerId, table.assetId)
      .where(sql`${table.status} in ('queued', 'starting', 'running', 'finalizing')`),
  ],
);

export type ScanJob = typeof scanJobsTable.$inferSelect;
export type InsertScanJob = typeof scanJobsTable.$inferInsert;
export type ScanJobStatus = (typeof scanJobStatusEnum.enumValues)[number];
