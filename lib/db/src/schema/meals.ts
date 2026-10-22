import { date, integer, pgTable, real, serial, text } from "drizzle-orm/pg-core";
import { foodsTable } from "./foods";
import { usersTable } from "./users";

export const mealsTable = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  foodId: integer("food_id").references(() => foodsTable.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  mealType: text("meal_type").notNull(),
  portionGrams: real("portion_grams").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbohydrates: real("carbohydrates").notNull(),
  fat: real("fat").notNull(),
  date: date("date", { mode: "string" }).notNull(),
});
