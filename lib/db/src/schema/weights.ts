import { date, pgTable, real, serial, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const weightsTable = pgTable("weights", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  weightKg: real("weight_kg").notNull(),
  date: date("date", { mode: "string" }).notNull(),
});
