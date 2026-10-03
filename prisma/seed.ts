import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }

  console.log('🌱 Starting Eclipse Database Seeding with User Profile & Schedule...');
  const sql = neon(connectionString);

  // 1. Fetch or create active primary User
  console.log('👤 Checking active user profile...');
  let users = await sql`SELECT id, email, name FROM users LIMIT 1;`;
  let userId: string;

  if (users.length > 0) {
    userId = users[0].id;
    console.log(`✅ Found active user: ${users[0].name || users[0].email} (ID: ${userId})`);
  } else {
    userId = 'user_active_default';
    await sql`
      INSERT INTO users (id, name, email, height_cm, created_at, updated_at)
      VALUES (${userId}, 'Active Athlete', 'athlete@eclipse.app', 178, NOW(), NOW());
    `;
    console.log(`✅ Created default active user with ID: ${userId}`);
  }

  // 2. Seed / Update UserGoal for 2950 calories, 130g protein, 4000ml water
  console.log('🎯 Seeding User Macro Goals (2950 kcal, 130g protein, 4000ml water)...');
  await sql`UPDATE user_goals SET is_active = false WHERE user_id = ${userId};`;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 84); // 12 weeks out

  await sql`
    INSERT INTO user_goals (id, user_id, goal_type, start_weight, target_weight, target_date, target_daily_cals, target_daily_protein, target_daily_water_ml, is_active, created_at, updated_at)
    VALUES (
      ${'goal_' + Date.now()},
      ${userId},
      'Maintain',
      78.5,
      80.0,
      ${targetDate.toISOString()},
      2950,
      130,
      4000,
      true,
      NOW(),
      NOW()
    );
  `;
  console.log('✅ User goal seeded: 2950 calories | 130g protein | 4000ml water');

  // 3. Seed DailyLog & Nutrition Entries for Today
  const today = new Date().toISOString().split('T')[0];
  console.log(`🥗 Seeding DailyLog & Nutrition Entries for ${today}...`);

  await sql`DELETE FROM nutrition_entries WHERE user_id = ${userId} AND date = ${today};`;
  await sql`DELETE FROM daily_logs WHERE user_id = ${userId} AND date = ${today};`;

  await sql`
    INSERT INTO daily_logs (id, user_id, date, morning_weight, total_calories, total_protein, total_water_ml, created_at, updated_at)
    VALUES (
      ${'log_' + Date.now()},
      ${userId},
      ${today},
      78.5,
      2950,
      130,
      4000,
      NOW(),
      NOW()
    );
  `;

  const nutritionItems = [
    { name: 'Water 1', category: 'Water', calories: 0, protein: 0, waterMl: 1000 },
    { name: 'BREAKFAST', category: 'Meal', calories: 765, protein: 43.0, waterMl: 0 },
    { name: 'Dry fruits', category: 'Snack', calories: 275, protein: 9.0, waterMl: 0 },
    { name: 'Water 2', category: 'Water', calories: 0, protein: 0, waterMl: 1000 },
    { name: 'LUNCH', category: 'Meal', calories: 600, protein: 15.0, waterMl: 0 },
    { name: 'Water 3', category: 'Water', calories: 0, protein: 0, waterMl: 1000 },
    { name: 'Pre-Snack', category: 'Snack', calories: 360, protein: 4.0, waterMl: 0 },
    { name: 'Eggs (3)', category: 'Meal', calories: 200, protein: 18.0, waterMl: 0 },
    { name: 'Water 4', category: 'Water', calories: 0, protein: 0, waterMl: 1000 },
    { name: 'DINNER', category: 'Meal', calories: 600, protein: 15.0, waterMl: 0 },
    { name: 'Whey Protein + Isabgol', category: 'Snack', calories: 100, protein: 25.0, waterMl: 0 },
    { name: '2 Soaked Anjeer', category: 'Snack', calories: 50, protein: 1.0, waterMl: 0 },
  ];

  for (let i = 0; i < nutritionItems.length; i++) {
    const item = nutritionItems[i];
    await sql`
      INSERT INTO nutrition_entries (id, user_id, date, item_name, category, calories, protein_g, water_ml, is_completed, created_at)
      VALUES (
        ${'nutr_' + Date.now() + '_' + i},
        ${userId},
        ${today},
        ${item.name},
        ${item.category},
        ${item.calories},
        ${item.protein},
        ${item.waterMl},
        true,
        NOW()
      );
    `;
  }
  console.log(`✅ ${nutritionItems.length} Nutrition items logged! Totals: 2950 kcal, 130g protein, 4000ml water.`);

  // 4. Seed 7-Day Workout Schedule with Drop Sets
  console.log('🏋️ Seeding Exact 7-Day Workout Schedule with Drop Set Flags...');

  const workoutSchedule = [
    {
      daySlug: 'push',
      splitDayName: 'Day 1: Push Day',
      exercises: [
        {
          name: 'Flat Bench Press',
          type: 'Compound',
          sets: [
            { weight: 25, reps: 7, isDropSet: false },
            { weight: 27.5, reps: 3, isDropSet: false },
            { weight: 27.5, reps: 3, isDropSet: true },
          ],
        },
        {
          name: 'Incline Chest Press',
          type: 'Compound',
          sets: [
            { weight: 20, reps: 13, isDropSet: false },
            { weight: 25, reps: 8, isDropSet: false },
            { weight: 30, reps: 4, isDropSet: true },
          ],
        },
        {
          name: 'Machine Shoulder Press',
          type: 'Compound',
          sets: [
            { weight: 30, reps: 8, isDropSet: false },
            { weight: 35, reps: 4, isDropSet: true },
          ],
        },
        {
          name: 'Cable Fly Middle',
          type: 'Isolation',
          sets: [
            { weight: 40, reps: 12, isDropSet: false },
            { weight: 45, reps: 8, isDropSet: true },
          ],
        },
        {
          name: 'Cable Fly Lower',
          type: 'Isolation',
          sets: [
            { weight: 35, reps: 12, isDropSet: false },
            { weight: 40, reps: 8, isDropSet: true },
          ],
        },
        {
          name: 'Single Hand Pushdown',
          type: 'Isolation',
          sets: [
            { weight: 15, reps: 15, isDropSet: false },
            { weight: 20, reps: 12, isDropSet: false },
            { weight: 25, reps: 8, isDropSet: false },
          ],
        },
        {
          name: 'Single Hand Overhead Triceps',
          type: 'Isolation',
          sets: [
            { weight: 15, reps: 15, isDropSet: false },
            { weight: 20, reps: 10, isDropSet: false },
            { weight: 40, reps: 8, isDropSet: true },
          ],
        },
        {
          name: 'Reverse Curl',
          type: 'Isolation',
          sets: [
            { weight: 40, reps: 20, isDropSet: false },
            { weight: 50, reps: 8, isDropSet: true },
          ],
        },
        {
          name: 'Forearm Curls',
          type: 'Isolation',
          sets: [
            { weight: 50, reps: 20, isDropSet: false },
            { weight: 60, reps: 15, isDropSet: false },
            { weight: 70, reps: 8, isDropSet: false },
          ],
        },
      ],
    },
    {
      daySlug: 'pull',
      splitDayName: 'Day 2: Pull Day',
      exercises: [
        {
          name: 'Pull-ups',
          type: 'Compound',
          sets: [
            { weight: 0, reps: 15, isDropSet: false },
            { weight: 0, reps: 15, isDropSet: false },
            { weight: 0, reps: 15, isDropSet: false },
          ],
        },
        {
          name: 'Cable Rowing',
          type: 'Compound',
          sets: [
            { weight: 80, reps: 20, isDropSet: false },
            { weight: 100, reps: 15, isDropSet: false },
            { weight: 100, reps: 15, isDropSet: false },
          ],
        },
        {
          name: 'Lat Pulldown',
          type: 'Compound',
          sets: [
            { weight: 71.5, reps: 15, isDropSet: false },
            { weight: 78, reps: 8, isDropSet: false },
            { weight: 84.5, reps: 4, isDropSet: true },
          ],
        },
        {
          name: 'Rear Delt Fly',
          type: 'Isolation',
          sets: [
            { weight: 40, reps: 15, isDropSet: false },
            { weight: 45, reps: 12, isDropSet: false },
            { weight: 50, reps: 8, isDropSet: false },
          ],
        },
        {
          name: 'Barbell Curl',
          type: 'Isolation',
          sets: [
            { weight: 10, reps: 20, isDropSet: false },
            { weight: 12.5, reps: 15, isDropSet: false },
            { weight: 15, reps: 8, isDropSet: false },
          ],
        },
        {
          name: 'Preacher Curl',
          type: 'Isolation',
          sets: [
            { weight: 40, reps: 12, isDropSet: false },
            { weight: 45, reps: 8, isDropSet: false },
            { weight: 50, reps: 4, isDropSet: true },
          ],
        },
        {
          name: 'Cable Crunches',
          type: 'Isolation',
          sets: [
            { weight: 50, reps: 20, isDropSet: false },
            { weight: 60, reps: 12, isDropSet: false },
            { weight: 70, reps: 8, isDropSet: true },
          ],
        },
        {
          name: 'Leg Raises',
          type: 'Isolation',
          sets: [
            { weight: 0, reps: 20, isDropSet: false },
            { weight: 0, reps: 20, isDropSet: false },
            { weight: 0, reps: 15, isDropSet: false },
          ],
        },
      ],
    },
    {
      daySlug: 'legs',
      splitDayName: 'Day 3: Legs & Shoulders',
      exercises: [
        {
          name: 'Super Squat',
          type: 'Compound',
          sets: [
            { weight: 50, reps: 20, isDropSet: false },
            { weight: 80, reps: 15, isDropSet: false },
            { weight: 100, reps: 13, isDropSet: false },
          ],
        },
        {
          name: 'Leg Extension',
          type: 'Compound',
          sets: [
            { weight: 70, reps: 20, isDropSet: false },
            { weight: 85, reps: 15, isDropSet: false },
            { weight: 100, reps: 10, isDropSet: false },
          ],
        },
        {
          name: 'Leg Curl',
          type: 'Isolation',
          sets: [
            { weight: 50, reps: 20, isDropSet: false },
            { weight: 60, reps: 15, isDropSet: false },
            { weight: 70, reps: 7, isDropSet: true },
          ],
        },
        {
          name: 'Calves',
          type: 'Isolation',
          sets: [
            { weight: 0, reps: 25, isDropSet: false },
            { weight: 0, reps: 25, isDropSet: false },
            { weight: 0, reps: 25, isDropSet: false },
            { weight: 0, reps: 25, isDropSet: false },
          ],
        },
        {
          name: 'Reverse Curl',
          type: 'Isolation',
          sets: [
            { weight: 30, reps: 20, isDropSet: false },
            { weight: 40, reps: 12, isDropSet: false },
            { weight: 45, reps: 8, isDropSet: true },
          ],
        },
        {
          name: 'Forearm Curls',
          type: 'Isolation',
          sets: [
            { weight: 50, reps: 20, isDropSet: false },
            { weight: 60, reps: 15, isDropSet: false },
            { weight: 70, reps: 8, isDropSet: true },
          ],
        },
      ],
    },
    {
      daySlug: 'upper',
      splitDayName: 'Day 5: Upper Body',
      exercises: [
        {
          name: 'Incline Bench Press',
          type: 'Compound',
          sets: [
            { weight: 20, reps: 12, isDropSet: false },
            { weight: 25, reps: 10, isDropSet: false },
            { weight: 27.5, reps: 8, isDropSet: false },
          ],
        },
        {
          name: 'Cable Fly',
          type: 'Isolation',
          sets: [
            { weight: 35, reps: 15, isDropSet: false },
            { weight: 40, reps: 12, isDropSet: false },
            { weight: 45, reps: 10, isDropSet: false },
          ],
        },
        {
          name: 'Pull-ups',
          type: 'Compound',
          sets: [
            { weight: 0, reps: 15, isDropSet: false },
            { weight: 0, reps: 15, isDropSet: false },
          ],
        },
        {
          name: 'Cable Rowing',
          type: 'Compound',
          sets: [
            { weight: 80, reps: 20, isDropSet: false },
            { weight: 100, reps: 15, isDropSet: false },
            { weight: 100, reps: 15, isDropSet: false },
          ],
        },
        {
          name: 'Lat Pulldown',
          type: 'Compound',
          sets: [
            { weight: 71.5, reps: 15, isDropSet: false },
            { weight: 78, reps: 8, isDropSet: false },
            { weight: 84, reps: 4, isDropSet: true },
          ],
        },
        {
          name: 'Cable Side Delts',
          type: 'Isolation',
          sets: [
            { weight: 5, reps: 15, isDropSet: false },
            { weight: 7.5, reps: 12, isDropSet: false },
            { weight: 10, reps: 10, isDropSet: false },
          ],
        },
        {
          name: 'Single Hand Rope Pushdown',
          type: 'Isolation',
          sets: [
            { weight: 10, reps: 15, isDropSet: false },
            { weight: 15, reps: 12, isDropSet: false },
            { weight: 20, reps: 10, isDropSet: false },
          ],
        },
        {
          name: 'Overhead Cable Extension',
          type: 'Isolation',
          sets: [
            { weight: 40, reps: 15, isDropSet: false },
            { weight: 45, reps: 12, isDropSet: false },
            { weight: 50, reps: 8, isDropSet: false },
          ],
        },
        {
          name: 'Bar Curl',
          type: 'Compound',
          sets: [
            { weight: 20, reps: 12, isDropSet: false },
            { weight: 25, reps: 10, isDropSet: false },
            { weight: 30, reps: 8, isDropSet: false },
          ],
        },
        {
          name: 'Preacher Curl',
          type: 'Isolation',
          sets: [
            { weight: 15, reps: 12, isDropSet: false },
            { weight: 20, reps: 10, isDropSet: false },
            { weight: 20, reps: 8, isDropSet: false },
          ],
        },
        {
          name: 'Cable Crunches',
          type: 'Isolation',
          sets: [
            { weight: 50, reps: 20, isDropSet: false },
            { weight: 60, reps: 12, isDropSet: false },
            { weight: 70, reps: 8, isDropSet: true },
          ],
        },
        {
          name: 'Leg Raises',
          type: 'Isolation',
          sets: [
            { weight: 0, reps: 20, isDropSet: false },
            { weight: 0, reps: 20, isDropSet: false },
            { weight: 0, reps: 15, isDropSet: false },
          ],
        },
      ],
    },
    {
      daySlug: 'lower',
      splitDayName: 'Day 6: Lower Body',
      exercises: [
        {
          name: 'Super Squat',
          type: 'Compound',
          sets: [
            { weight: 50, reps: 20, isDropSet: false },
            { weight: 80, reps: 15, isDropSet: false },
            { weight: 100, reps: 13, isDropSet: false },
          ],
        },
        {
          name: 'Leg Extension',
          type: 'Compound',
          sets: [
            { weight: 70, reps: 20, isDropSet: false },
            { weight: 85, reps: 15, isDropSet: false },
            { weight: 100, reps: 10, isDropSet: false },
          ],
        },
        {
          name: 'Leg Curl',
          type: 'Isolation',
          sets: [
            { weight: 50, reps: 20, isDropSet: false },
            { weight: 60, reps: 15, isDropSet: false },
            { weight: 70, reps: 7, isDropSet: true },
          ],
        },
        {
          name: 'Calves',
          type: 'Isolation',
          sets: [
            { weight: 0, reps: 25, isDropSet: false },
            { weight: 0, reps: 25, isDropSet: false },
            { weight: 0, reps: 25, isDropSet: false },
            { weight: 0, reps: 25, isDropSet: false },
          ],
        },
        {
          name: 'Reverse Curl',
          type: 'Isolation',
          sets: [
            { weight: 30, reps: 20, isDropSet: false },
            { weight: 40, reps: 12, isDropSet: false },
            { weight: 45, reps: 8, isDropSet: true },
          ],
        },
        {
          name: 'Forearm Curls',
          type: 'Isolation',
          sets: [
            { weight: 50, reps: 20, isDropSet: false },
            { weight: 60, reps: 15, isDropSet: false },
            { weight: 70, reps: 8, isDropSet: true },
          ],
        },
      ],
    },
  ];

  const now = new Date();

  for (const day of workoutSchedule) {
    let totalTonnage = 0;
    day.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        totalTonnage += s.weight * s.reps;
      });
    });

    // Clear existing sessions for this split day name
    await sql`DELETE FROM workout_sessions WHERE user_id = ${userId} AND (split_day_name = ${day.splitDayName} OR split_day_name ILIKE ${'%' + day.daySlug + '%'});`;

    const pendingSessionId = 'session_pending_' + day.daySlug + '_' + Date.now();
    await sql`
      INSERT INTO workout_sessions (id, user_id, date, split_day_name, total_tonnage, is_completed, created_at, updated_at)
      VALUES (
        ${pendingSessionId},
        ${userId},
        ${now.toISOString()},
        ${day.splitDayName},
        0,
        false,
        ${now.toISOString()},
        NOW()
      );
    `;

    let setCounter = 1;
    for (const ex of day.exercises) {
      for (let sIdx = 0; sIdx < ex.sets.length; sIdx++) {
        const setItem = ex.sets[sIdx];
        const setId = 'set_' + pendingSessionId + '_' + setCounter++;

        await sql`
          INSERT INTO workout_sets (id, session_id, exercise_name, set_number, target_weight, target_reps, actual_weight, actual_reps, is_completed, is_drop_set, created_at)
          VALUES (
            ${setId},
            ${pendingSessionId},
            ${ex.name},
            ${sIdx + 1},
            ${setItem.weight},
            ${setItem.reps},
            NULL,
            NULL,
            false,
            ${setItem.isDropSet},
            ${now.toISOString()}
          );
        `;
      }
    }
    console.log(`  ✅ Seeded ${day.splitDayName} (${day.exercises.length} exercises)`);
  }

  console.log('\n🎉 ALL SEEDING COMPLETE FOR ECLIPSE APP!');
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
