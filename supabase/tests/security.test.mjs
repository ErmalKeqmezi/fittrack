import { createClient } from "@supabase/supabase-js";
// Run against a FRESH local database: npm run db:reset && npm run test:db
// It creates a test owner account; run `npm run db:reset` afterwards.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url?.includes("127.0.0.1") && !url?.includes("localhost")) throw new Error("Refusing to run security tests against a non-local Supabase.");
const mk = () => createClient(url, key, { auth: { persistSession: false } });
let fails = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${extra}`); if (!ok) fails++; };

const anon = mk();
let r = await anon.rpc("is_setup_complete");
check("setup not complete initially", r.data === false, JSON.stringify(r.error));
r = await anon.from("exercises").select("id");
check("anon cannot read exercises", !!r.error || r.data.length === 0, r.error?.code);
r = await anon.from("muscle_groups").select("id");
check("anon cannot read muscle_groups", !!r.error || r.data.length === 0, r.error?.code);

const owner = mk();
r = await owner.auth.signUp({ email: "owner@fittrack.test", password: "TestPass1234", options: { data: { display_name: "Test Owner" } } });
check("first sign-up succeeds with session", !r.error && !!r.data.session, r.error?.message);
const uid = r.data.user?.id;

r = await anon.rpc("is_setup_complete");
check("setup complete after first sign-up", r.data === true);

const intruder = mk();
r = await intruder.auth.signUp({ email: "intruder@fittrack.test", password: "TestPass1234" });
check("second sign-up is rejected", !!r.error, r.error?.message);

r = await owner.from("profiles").select("*");
check("profile auto-created", r.data?.length === 1 && r.data[0].display_name === "Test Owner");
r = await owner.from("exercises").select("id", { count: "exact", head: true });
check("owner sees built-in library", r.count >= 60, `count=${r.count}`);
r = await owner.from("exercise_secondary_muscles").select("exercise_id", { count: "exact", head: true });
check("secondary muscles seeded", r.count > 50, `count=${r.count}`);

r = await owner.from("muscle_groups").insert({ slug: "x", name: "X", body_region: "core" });
check("owner cannot write muscle_groups", !!r.error, r.error?.code);
const builtin = (await owner.from("exercises").select("id").is("user_id", null).limit(1)).data[0];
r = await owner.from("exercises").update({ name: "Hacked" }).eq("id", builtin.id).select();
check("owner cannot edit built-in exercise", !!r.error || r.data.length === 0);
r = await owner.from("exercises").insert({ user_id: uid, name: "Landmine Press", primary_muscle_group_id: 6, equipment: "barbell", category: "compound" }).select().single();
check("owner can create custom exercise", !r.error, r.error?.message);
r = await owner.from("exercises").insert({ user_id: uid, name: "landmine press", primary_muscle_group_id: 6, equipment: "barbell", category: "compound" });
check("duplicate custom name rejected", r.error?.code === "23505", r.error?.code);

r = await owner.from("workout_plans").insert({ name: "PPL" }).select().single();
check("plan insert defaults user_id", !r.error && r.data.user_id === uid, r.error?.message);
const plan = r.data;
r = await owner.from("workout_plans").insert({ name: "Spoof", user_id: "00000000-0000-0000-0000-000000000001" });
check("cannot insert plan for another user", !!r.error, r.error?.code);
r = await owner.from("workout_days").insert({ plan_id: plan.id, name: "Push", position: 0, weekday: 1 }).select().single();
check("day insert", !r.error, r.error?.message);
r = await owner.from("plan_exercises").insert({ workout_day_id: r.data.id, exercise_id: builtin.id, position: 0, target_sets: 3, target_reps_min: 10, target_reps_max: 8 });
check("reps max < min rejected", r.error?.code === "23514", r.error?.code);

r = await owner.from("workout_sessions").insert({ name: "Push" }).select().single();
check("session insert", !r.error, r.error?.message);
const s = r.data;
r = await owner.from("workout_sessions").insert({ name: "Second" });
check("only one in-progress session", r.error?.code === "23505", r.error?.code);
r = await owner.from("session_exercises").insert({ session_id: s.id, exercise_id: builtin.id, exercise_name: "Bench", position: 0 }).select().single();
const se = r.data;
r = await owner.from("exercise_sets").insert([{ session_exercise_id: se.id, set_number: 1, weight_kg: 70, reps: 10 }, { session_exercise_id: se.id, set_number: 2, weight_kg: 70, reps: 9, rpe: 8.5 }]);
check("sets insert", !r.error, r.error?.message);
r = await owner.from("exercise_sets").insert({ session_exercise_id: se.id, set_number: 3, weight_kg: -5, reps: 10 });
check("negative weight rejected", r.error?.code === "23514", r.error?.code);
r = await owner.from("exercise_sets").insert({ session_exercise_id: se.id, set_number: 3, weight_kg: 70, reps: 8, rpe: 8.3 });
check("RPE must be in 0.5 steps", r.error?.code === "23514", r.error?.code);
r = await owner.from("workout_sessions").update({ status: "completed" }).eq("id", s.id);
check("completed requires ended_at", r.error?.code === "23514", r.error?.code);
r = await owner.from("workout_sessions").update({ status: "completed", ended_at: new Date().toISOString() }).eq("id", s.id);
check("finish session", !r.error, r.error?.message);

r = await anon.from("workout_sessions").select("id");
check("anon cannot read sessions", !!r.error || r.data.length === 0, r.error?.code);
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
