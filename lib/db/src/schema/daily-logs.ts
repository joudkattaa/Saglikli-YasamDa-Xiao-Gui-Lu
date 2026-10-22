import { date, integer, pgTable, serial, text, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const dailyLogsTable = pgTable(
  "daily_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    steps: integer("steps").notNull().default(0),
    waterMl: integer("water_ml").notNull().default(0),
    sleepMinutes: integer("sleep_minutes").notNull().default(0),
  },
  (table) => [unique().on(table.userId, table.date)],
);
