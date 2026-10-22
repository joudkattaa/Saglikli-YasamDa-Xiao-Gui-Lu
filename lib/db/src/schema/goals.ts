import { integer, pgTable, real, text } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const goalsTable = pgTable("goals", {
  userId: text("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  calorieGoal: integer("calorie_goal").notNull().default(2000),
  stepGoal: integer("step_goal").notNull().default(8000),
  waterGoalMl: integer("water_goal_ml").notNull().default(2000),
  sleepGoalMinutes: integer("sleep_goal_minutes").notNull().default(480),
  currentWeightKg: real("current_weight_kg"),
  targetWeightKg: real("target_weight_kg"),
  weightDirection: text("weight_direction").notNull().default("koru"),
});
