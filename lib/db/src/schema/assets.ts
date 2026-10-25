import {
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const assetsTable = pgTable(
  "assets",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    host: text("host").notNull(),
    authorizationConfirmed: boolean("authorization_confirmed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastScannedAt: timestamp("last_scanned_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("assets_owner_url_active_unique")
      .on(table.ownerId, table.url)
      .where(sql`${table.archivedAt} is null`),
  ],
);

export type Asset = typeof assetsTable.$inferSelect;
export type InsertAsset = typeof assetsTable.$inferInsert;
