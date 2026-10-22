import { pgTable, real, serial, text } from "drizzle-orm/pg-core";

export const foodsTable = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  servingGrams: real("serving_grams").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbohydrates: real("carbohydrates").notNull(),
  fat: real("fat").notNull(),
});
