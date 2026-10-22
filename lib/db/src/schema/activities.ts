import { date, integer, pgTable, real, serial, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  distanceKm: real("distance_km"),
  estimatedCalories: real("estimated_calories").notNull(),
  date: date("date", { mode: "string" }).notNull(),
});
