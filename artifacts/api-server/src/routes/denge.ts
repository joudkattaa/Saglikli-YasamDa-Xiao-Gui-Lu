import { and, asc, desc, eq, gte, ilike, lte } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateActivityResponse,
  CreateActivityBody,
  CreateMealResponse,
  CreateMealBody,
  CreateWeightResponse,
  CreateWeightBody,
  DeleteActivityParams,
  DeleteMealParams,
  DeleteWeightParams,
  GetActivitiesQueryParams,
  GetActivitiesResponse,
  GetDashboardQueryParams,
  GetDashboardResponse,
  GetDailyLogQueryParams,
  GetDailyLogResponse,
  GetFoodsQueryParams,
  GetFoodsResponse,
  GetGoalsResponse,
  GetMealsQueryParams,
  GetMealsResponse,
  GetProfileResponse,
  GetWeightsResponse,
  UpdateActivityResponse,
  UpdateActivityBody,
  UpdateActivityParams,
  UpdateGoalsBody,
  UpdateGoalsResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  UpdateMealResponse,
  UpdateMealBody,
  UpdateMealParams,
  UpdateWeightResponse,
  UpdateWeightBody,
  UpdateWeightParams,
  UpsertDailyLogBody,
  UpsertDailyLogQueryParams,
  UpsertDailyLogResponse,
} from "@workspace/api-zod";
import {
  activitiesTable,
  dailyLogsTable,
  db,
  foodsTable,
  goalsTable,
  mealsTable,
  usersTable,
  weightsTable,
} from "@workspace/db";

const router: IRouter = Router();

function getUserId(req: Request, res: Response): string | null {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Giriş yapmanız gerekiyor." });
    return null;
  }
  return userId;
}

async function ensureUser(userId: string): Promise<void> {
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();
  await db
    .insert(goalsTable)
    .values({ userId })
    .onConflictDoNothing({ target: goalsTable.userId });
}

function dateRange(date: string): { start: string; end: string } {
  const endDate = new Date(`${date}T00:00:00.000Z`);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 6);
  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
  };
}

async function refreshCurrentWeight(userId: string): Promise<void> {
  const [latest] = await db
    .select({ weightKg: weightsTable.weightKg })
    .from(weightsTable)
    .where(eq(weightsTable.userId, userId))
    .orderBy(desc(weightsTable.date), desc(weightsTable.id))
    .limit(1);
  await db
    .update(goalsTable)
    .set({ currentWeightKg: latest?.weightKg ?? null })
    .where(eq(goalsTable.userId, userId));
}

router.get("/dashboard", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const query = GetDashboardQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  await ensureUser(userId);
  const { date } = query.data;
  const [meals, activities, [dailyLog], [goals], [latestWeight], weeklyLogs] =
    await Promise.all([
      db.select().from(mealsTable).where(
        and(eq(mealsTable.userId, userId), eq(mealsTable.date, date)),
      ),
      db.select().from(activitiesTable).where(
        and(eq(activitiesTable.userId, userId), eq(activitiesTable.date, date)),
      ),
      db.select().from(dailyLogsTable).where(
        and(eq(dailyLogsTable.userId, userId), eq(dailyLogsTable.date, date)),
      ),
      db.select().from(goalsTable).where(eq(goalsTable.userId, userId)),
      db.select({ weightKg: weightsTable.weightKg }).from(weightsTable)
        .where(eq(weightsTable.userId, userId))
        .orderBy(desc(weightsTable.date), desc(weightsTable.id))
        .limit(1),
      db.select({ date: dailyLogsTable.date, steps: dailyLogsTable.steps })
        .from(dailyLogsTable)
        .where(and(
          eq(dailyLogsTable.userId, userId),
          gte(dailyLogsTable.date, dateRange(date).start),
          lte(dailyLogsTable.date, date),
        ))
        .orderBy(asc(dailyLogsTable.date)),
    ]);
  const weekByDate = new Map(weeklyLogs.map((row) => [row.date, row.steps]));
  const { start } = dateRange(date);
  const weeklySteps = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${start}T00:00:00.000Z`);
    day.setUTCDate(day.getUTCDate() + index);
    const dayString = day.toISOString().slice(0, 10);
    return { date: dayString, steps: weekByDate.get(dayString) ?? 0 };
  });
  const summary = {
    date,
    caloriesConsumed: meals.reduce((sum, meal) => sum + meal.calories, 0),
    caloriesBurned: activities.reduce(
      (sum, activity) => sum + activity.estimatedCalories,
      0,
    ),
    calorieGoal: goals.calorieGoal,
    steps: dailyLog?.steps ?? 0,
    stepGoal: goals.stepGoal,
    waterMl: dailyLog?.waterMl ?? 0,
    waterGoalMl: goals.waterGoalMl,
    sleepMinutes: dailyLog?.sleepMinutes ?? 0,
    sleepGoalMinutes: goals.sleepGoalMinutes,
    protein: meals.reduce((sum, meal) => sum + meal.protein, 0),
    carbohydrates: meals.reduce((sum, meal) => sum + meal.carbohydrates, 0),
    fat: meals.reduce((sum, meal) => sum + meal.fat, 0),
    weeklySteps,
    latestWeightKg: latestWeight?.weightKg ?? goals.currentWeightKg,
    targetWeightKg: goals.targetWeightKg,
  };
  res.json(GetDashboardResponse.parse(summary));
});

router.get("/foods", async (req, res): Promise<void> => {
  const query = GetFoodsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const foods = await db
    .select()
    .from(foodsTable)
    .where(query.data.search ? ilike(foodsTable.name, `%${query.data.search}%`) : undefined)
    .orderBy(asc(foodsTable.name));
  res.json(GetFoodsResponse.parse(foods));
});

router.get("/meals", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const query = GetMealsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  await ensureUser(userId);
  const meals = await db.select().from(mealsTable).where(
    and(eq(mealsTable.userId, userId), eq(mealsTable.date, query.data.date)),
  );
  res.json(GetMealsResponse.parse(meals));
});

router.post("/meals", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const body = CreateMealBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await ensureUser(userId);
  const [meal] = await db.insert(mealsTable)
    .values({ ...body.data, userId, foodId: body.data.foodId ?? null })
    .returning();
  res.status(201).json(CreateMealResponse.parse(meal));
});

router.patch("/meals/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const params = UpdateMealParams.safeParse(req.params);
  const body = UpdateMealBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.error?.message ?? body.error?.message });
    return;
  }
  const [meal] = await db.update(mealsTable)
    .set(body.data)
    .where(and(eq(mealsTable.id, params.data.id), eq(mealsTable.userId, userId)))
    .returning();
  if (!meal) {
    res.status(404).json({ error: "Öğün kaydı bulunamadı." });
    return;
  }
  res.json(UpdateMealResponse.parse(meal));
});

router.delete("/meals/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const params = DeleteMealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [meal] = await db.delete(mealsTable)
    .where(and(eq(mealsTable.id, params.data.id), eq(mealsTable.userId, userId)))
    .returning({ id: mealsTable.id });
  if (!meal) {
    res.status(404).json({ error: "Öğün kaydı bulunamadı." });
    return;
  }
  res.sendStatus(204);
});

router.get("/activities", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const query = GetActivitiesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  await ensureUser(userId);
  const activities = await db.select().from(activitiesTable).where(
    and(
      eq(activitiesTable.userId, userId),
      eq(activitiesTable.date, query.data.date),
    ),
  );
  res.json(GetActivitiesResponse.parse(activities));
});

router.post("/activities", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const body = CreateActivityBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await ensureUser(userId);
  const [activity] = await db.insert(activitiesTable)
    .values({ ...body.data, userId, distanceKm: body.data.distanceKm ?? null })
    .returning();
  res.status(201).json(CreateActivityResponse.parse(activity));
});

router.patch("/activities/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const params = UpdateActivityParams.safeParse(req.params);
  const body = UpdateActivityBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.error?.message ?? body.error?.message });
    return;
  }
  const [activity] = await db.update(activitiesTable)
    .set({ ...body.data, distanceKm: body.data.distanceKm ?? null })
    .where(and(
      eq(activitiesTable.id, params.data.id),
      eq(activitiesTable.userId, userId),
    ))
    .returning();
  if (!activity) {
    res.status(404).json({ error: "Aktivite kaydı bulunamadı." });
    return;
  }
  res.json(UpdateActivityResponse.parse(activity));
});

router.delete("/activities/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const params = DeleteActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [activity] = await db.delete(activitiesTable)
    .where(and(
      eq(activitiesTable.id, params.data.id),
      eq(activitiesTable.userId, userId),
    ))
    .returning({ id: activitiesTable.id });
  if (!activity) {
    res.status(404).json({ error: "Aktivite kaydı bulunamadı." });
    return;
  }
  res.sendStatus(204);
});

router.get("/daily-log", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const query = GetDailyLogQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  await ensureUser(userId);
  const [log] = await db.select().from(dailyLogsTable).where(
    and(
      eq(dailyLogsTable.userId, userId),
      eq(dailyLogsTable.date, query.data.date),
    ),
  );
  res.json(GetDailyLogResponse.parse(log ?? {
    date: query.data.date,
    steps: 0,
    waterMl: 0,
    sleepMinutes: 0,
  }));
});

router.put("/daily-log", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const query = UpsertDailyLogQueryParams.safeParse(req.query);
  const body = UpsertDailyLogBody.safeParse(req.body);
  if (!query.success || !body.success) {
    res.status(400).json({ error: query.error?.message ?? body.error?.message });
    return;
  }
  await ensureUser(userId);
  const [log] = await db.insert(dailyLogsTable)
    .values({ ...body.data, userId, date: query.data.date })
    .onConflictDoUpdate({
      target: [dailyLogsTable.userId, dailyLogsTable.date],
      set: body.data,
    })
    .returning();
  res.json(UpsertDailyLogResponse.parse(log));
});

router.get("/goals", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  await ensureUser(userId);
  const [goals] = await db.select().from(goalsTable)
    .where(eq(goalsTable.userId, userId));
  res.json(GetGoalsResponse.parse(goals));
});

router.put("/goals", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const body = UpdateGoalsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await ensureUser(userId);
  const [goals] = await db.update(goalsTable)
    .set(body.data)
    .where(eq(goalsTable.userId, userId))
    .returning();
  res.json(UpdateGoalsResponse.parse(goals));
});

router.get("/profile", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  await ensureUser(userId);
  const [profile] = await db
    .select({ ageYears: usersTable.ageYears })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  res.json(GetProfileResponse.parse({ ageYears: profile?.ageYears ?? null }));
});

router.put("/profile", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const body = UpdateProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await ensureUser(userId);
  const [profile] = await db
    .update(usersTable)
    .set({ ageYears: body.data.ageYears })
    .where(eq(usersTable.id, userId))
    .returning({ ageYears: usersTable.ageYears });
  res.json(UpdateProfileResponse.parse({ ageYears: profile?.ageYears ?? null }));
});

router.get("/weights", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  await ensureUser(userId);
  const weights = await db.select().from(weightsTable)
    .where(eq(weightsTable.userId, userId))
    .orderBy(asc(weightsTable.date), asc(weightsTable.id));
  res.json(GetWeightsResponse.parse(weights));
});

router.post("/weights", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const body = CreateWeightBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await ensureUser(userId);
  const [weight] = await db.insert(weightsTable)
    .values({ ...body.data, userId })
    .returning();
  await refreshCurrentWeight(userId);
  res.status(201).json(CreateWeightResponse.parse(weight));
});

router.patch("/weights/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const params = UpdateWeightParams.safeParse(req.params);
  const body = UpdateWeightBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: params.error?.message ?? body.error?.message });
    return;
  }
  const [weight] = await db.update(weightsTable)
    .set(body.data)
    .where(and(eq(weightsTable.id, params.data.id), eq(weightsTable.userId, userId)))
    .returning();
  if (!weight) {
    res.status(404).json({ error: "Kilo kaydı bulunamadı." });
    return;
  }
  await refreshCurrentWeight(userId);
  res.json(UpdateWeightResponse.parse(weight));
});

router.delete("/weights/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req, res);
  if (!userId) return;
  const params = DeleteWeightParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [weight] = await db.delete(weightsTable)
    .where(and(eq(weightsTable.id, params.data.id), eq(weightsTable.userId, userId)))
    .returning({ id: weightsTable.id });
  if (!weight) {
    res.status(404).json({ error: "Kilo kaydı bulunamadı." });
    return;
  }
  await refreshCurrentWeight(userId);
  res.sendStatus(204);
});

export default router;
