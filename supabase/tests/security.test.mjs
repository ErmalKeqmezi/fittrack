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

const second = mk();
r = await second.auth.signUp({ email: "second@fittrack.test", password: "TestPass1234" });
check("second account is allowed", !r.error && !!r.data.session, r.error?.message);
const secondId = r.data.user?.id;
r = await anon.rpc("is_setup_complete");
check("public setup stays closed with two accounts", r.data === true);

const intruder = mk();
r = await intruder.auth.signUp({ email: "intruder@fittrack.test", password: "TestPass1234" });
check("third sign-up is rejected", !!r.error, r.error?.message);

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
r = await owner.from("session_summaries").select("volume_kg, working_set_count").eq("id", s.id).single();
check("session summary aggregates sets", Number(r.data?.volume_kg) === 1330 && r.data?.working_set_count === 2, JSON.stringify(r.data));
r = await owner.from("exercise_session_bests").select("top_weight_kg, best_e1rm_kg").eq("session_id", s.id).single();
check("exercise bests computes est. 1RM", Number(r.data?.best_e1rm_kg) === 93.33, JSON.stringify(r.data));
r = await anon.from("session_summaries").select("id");
check("anon cannot read session_summaries", !!r.error || r.data.length === 0, r.error?.code);
r = await anon.from("exercise_session_bests").select("session_id");
check("anon cannot read exercise_session_bests", !!r.error || r.data.length === 0, r.error?.code);
r = await owner.from("profiles").update({ timezone: "Mars/Olympus" }).eq("id", uid);
check("invalid timezone rejected", r.error?.code === "23514", r.error?.code);

// save_custom_exercise RPC
r = await owner.rpc("save_custom_exercise", { p_name: "Cable Y Raise", p_description: "", p_primary_muscle_group_id: 7, p_secondary_muscle_group_ids: [8, 7, 8], p_equipment: "cable", p_category: "isolation" });
check("RPC creates custom exercise", !r.error && typeof r.data === "string", r.error?.message);
const customId = r.data;
r = await owner.from("exercise_secondary_muscles").select("muscle_group_id").eq("exercise_id", customId);
check("RPC dedupes secondary and drops primary", r.data?.length === 1 && r.data[0].muscle_group_id === 8, JSON.stringify(r.data));
r = await owner.rpc("save_custom_exercise", { p_name: "Barbell Bench Press", p_description: "", p_primary_muscle_group_id: 1, p_secondary_muscle_group_ids: [], p_equipment: "barbell", p_category: "compound" });
check("RPC rejects shadowing a built-in name", r.error?.code === "23505", r.error?.code);
r = await owner.rpc("save_custom_exercise", { p_exercise_id: builtin.id, p_name: "Hijack", p_description: "", p_primary_muscle_group_id: 1, p_secondary_muscle_group_ids: [], p_equipment: "barbell", p_category: "compound" });
check("RPC cannot edit a built-in exercise", r.error?.code === "P0002", r.error?.code);
r = await anon.rpc("save_custom_exercise", { p_name: "Anon", p_description: "", p_primary_muscle_group_id: 1, p_secondary_muscle_group_ids: [], p_equipment: "barbell", p_category: "compound" });
check("anon cannot call save_custom_exercise", !!r.error, r.error?.code);
r = await owner.from("exercises").delete().eq("id", builtin.id).select();
check("owner cannot delete built-in exercise", !!r.error || r.data.length === 0);

// Planner functions
r = await owner.rpc("create_workout_plan", { p_name: "RPC plan", p_days: [
  { name: "A", weekday: 1, exercises: [{ exercise_id: builtin.id, target_sets: 3, target_reps_min: 8, target_reps_max: 10 }] },
  { name: "B", weekday: 2, is_rest_day: true, exercises: [{ exercise_id: builtin.id, target_sets: 3, target_reps_min: 8, target_reps_max: 10 }] },
] });
check("create_workout_plan creates plan atomically", !r.error && typeof r.data === "string", r.error?.message);
const rpcPlan = r.data;
r = await owner.from("workout_days").select("id, name, weekday, plan_exercises(id)").eq("plan_id", rpcPlan).order("position");
check("rest day from payload has no exercises", r.data?.[1]?.plan_exercises.length === 0 && r.data?.[0]?.plan_exercises.length === 1);
const dayB = r.data[1];
r = await owner.rpc("create_workout_plan", { p_name: "Bad", p_days: [{ name: "X", exercises: [{ exercise_id: builtin.id, target_sets: 3, target_reps_min: 10, target_reps_max: 8 }] }] });
check("create_workout_plan rolls back on invalid exercise", !!r.error);
r = await owner.from("workout_plans").select("id").eq("name", "Bad");
check("no partial plan left behind", r.data?.length === 0);
r = await owner.rpc("add_plan_exercise", { p_day_id: dayB.id, p_exercise_id: builtin.id, p_target_sets: 3, p_target_reps_min: 8, p_target_reps_max: 10 });
check("rest day rejects exercises", r.error?.code === "22023", r.error?.code);
r = await owner.rpc("update_workout_day", { p_day_id: dayB.id, p_name: "B", p_weekday: 1, p_is_rest_day: false });
r = await owner.from("workout_days").select("name, weekday").eq("plan_id", rpcPlan).order("position");
check("weekday moves between days", r.data?.[0].weekday === null && r.data?.[1].weekday === 1, JSON.stringify(r.data));
r = await owner.rpc("move_workout_day", { p_day_id: dayB.id, p_offset: -1 });
r = await owner.from("workout_days").select("name").eq("plan_id", rpcPlan).order("position");
check("move_workout_day swaps positions", r.data?.map((d) => d.name).join() === "B,A", JSON.stringify(r.data));
r = await owner.rpc("set_active_plan", { p_plan_id: rpcPlan, p_active: true });
r = await owner.rpc("set_active_plan", { p_plan_id: plan.id, p_active: true });
r = await owner.from("workout_plans").select("id").eq("is_active", true);
check("only one active plan", r.data?.length === 1 && r.data[0].id === plan.id, JSON.stringify(r.data));
r = await anon.rpc("create_workout_plan", { p_name: "Anon" });
check("anon cannot create plans", !!r.error, r.error?.code);

// Workout tracking functions
const uuid = () => crypto.randomUUID();
r = await owner.rpc("start_workout_session", {});
check("start_workout_session creates an empty workout", !r.error && typeof r.data === "string", r.error?.message);
const live = r.data;
r = await owner.rpc("start_workout_session", {});
check("starting again resumes the same workout", r.data === live);
const seId = uuid(), setDone = uuid(), setOpen = uuid();
const snapshot = { p_session_id: live, p_name: "Live", p_notes: "", p_exercises: [{ id: seId, exercise_id: builtin.id, notes: "", sets: [
  { id: setDone, weight_kg: 80, reps: 5, rpe: 8, is_warmup: false, is_completed: true },
  { id: setOpen, weight_kg: 80, reps: 5, rpe: null, is_warmup: false, is_completed: false },
] }] };
r = await owner.rpc("save_workout_session", snapshot);
check("save_workout_session stores a snapshot", !r.error, r.error?.message);
r = await owner.rpc("save_workout_session", snapshot);
check("saving the same snapshot twice is idempotent", !r.error, r.error?.message);
r = await owner.from("exercise_sets").select("id").eq("session_exercise_id", seId);
check("no duplicate sets after retry", r.data?.length === 2, JSON.stringify(r.data));
r = await owner.rpc("save_workout_session", { ...snapshot, p_exercises: [{ ...snapshot.p_exercises[0], exercise_id: "00000000-0000-0000-0000-00000000dead" }] });
r = await owner.from("session_exercises").select("exercise_id").eq("id", seId).single();
check("exercise of an existing row is never swapped", r.data?.exercise_id === builtin.id);
r = await owner.rpc("finish_workout_session", { p_session_id: live });
check("finish_workout_session completes", !r.error, r.error?.message);
r = await owner.from("exercise_sets").select("id").eq("session_exercise_id", seId);
check("finish drops unfinished sets", r.data?.length === 1 && r.data[0].id === setDone, JSON.stringify(r.data));
r = await owner.rpc("finish_workout_session", { p_session_id: live });
check("cannot finish twice", r.error?.code === "22023", r.error?.code);
r = await owner.rpc("get_previous_performance", { p_exercise_ids: [builtin.id], p_before: new Date(Date.now() + 60000).toISOString() });
check("previous performance returns last completed sets", r.data?.some((row) => row.session_id === live && Number(row.weight_kg) === 80), r.error?.message);
// Personal records follow the logged sets
r = await owner.from("personal_records").select("record_type, value").eq("exercise_id", builtin.id);
check("records created on finish (one per type)", r.data?.length === 3, JSON.stringify(r.data));
r = await owner.rpc("save_workout_session", { p_session_id: live, p_name: "Live", p_notes: "", p_exercises: [{ id: seId, exercise_id: builtin.id, notes: "", sets: [
  { id: setDone, weight_kg: 90, reps: 3, rpe: null, is_warmup: false, is_completed: true },
] }] });
r = await owner.from("personal_records").select("record_type, value").eq("exercise_id", builtin.id).order("record_type");
check("editing a workout updates records without duplicates", r.data?.length === 3 && r.data.find((x) => x.record_type === "max_weight")?.value == 90, JSON.stringify(r.data));
r = await owner.rpc("delete_workout_session", { p_session_id: live });
check("delete_workout_session deletes a completed workout", !r.error, r.error?.message);
r = await owner.from("personal_records").select("record_type, value, session_id").eq("exercise_id", builtin.id);
check(
  "deleting a workout falls back to the next best records",
  r.data?.length === 3 && r.data.every((x) => x.session_id !== live) && r.data.find((x) => x.record_type === "max_weight")?.value == 70,
  JSON.stringify(r.data),
);

r = await owner.rpc("start_workout_session", {});
const empty = r.data;
r = await owner.rpc("finish_workout_session", { p_session_id: empty });
check("cannot finish a workout without sets", r.error?.code === "22023", r.error?.code);
await owner.from("workout_sessions").delete().eq("id", empty);
r = await anon.rpc("start_workout_session", {});
check("anon cannot start workouts", !!r.error, r.error?.code);

// Body measurements
r = await owner.from("body_measurements").insert({ user_id: uid, measured_on: "2026-11-01", weight_kg: 80, biceps_cm: 38 }).select().single();
check("owner can log measurements", !r.error, r.error?.message);
const ownerMeasurement = r.data;
r = await owner.from("body_measurements").insert({ user_id: uid, measured_on: "2026-11-01", weight_kg: 81 });
check("one entry per day", r.error?.code === "23505", r.error?.code);
r = await owner.from("body_measurements").insert({ user_id: uid, measured_on: "2026-11-02" });
check("an empty entry is rejected", r.error?.code === "23514", r.error?.code);
r = await owner.from("body_measurements").insert({ user_id: uid, measured_on: "2026-11-03", weight_kg: 5 });
check("an impossible weight is rejected", r.error?.code === "23514", r.error?.code);
r = await anon.from("body_measurements").select("id");
check("anon cannot read measurements", !!r.error || r.data.length === 0, r.error?.code);
r = await second.from("body_measurements").update({ weight_kg: 50 }).eq("id", ownerMeasurement.id).select();
check("second account cannot edit the owner's measurements", !!r.error || r.data.length === 0);
r = await second.from("body_measurements").delete().eq("id", ownerMeasurement.id).select();
check("second account cannot delete the owner's measurements", !!r.error || r.data.length === 0);
r = await second.from("body_measurements").insert({ user_id: uid, measured_on: "2026-11-04", weight_kg: 60 });
check("second account cannot write measurements for the owner", !!r.error, r.error?.code);
r = await second.from("body_measurements").insert({ measured_on: "2026-11-01", weight_kg: 60 }).select().single();
check("both accounts can log the same date", !r.error && r.data.user_id === secondId, r.error?.message);
await second.from("body_measurements").delete().eq("id", r.data?.id);

// Isolation between the two real accounts
for (const table of ["body_measurements", "workout_plans", "workout_days", "plan_exercises", "workout_sessions", "session_exercises", "exercise_sets", "personal_records"]) {
  r = await second.from(table).select("id");
  check(`second account sees none of the owner's ${table}`, !r.error && r.data.length === 0, r.error?.message ?? `rows=${r.data.length}`);
}
for (const view of ["session_summaries", "exercise_session_bests"]) {
  r = await second.from(view).select("user_id");
  check(`second account sees none of the owner's ${view}`, !r.error && r.data.length === 0, r.error?.message);
}
r = await second.from("profiles").select("id");
check("second account sees only its own profile", r.data?.length === 1 && r.data[0].id === secondId, JSON.stringify(r.data));
r = await second.from("exercises").select("id").not("user_id", "is", null);
check("second account sees no custom exercises of the owner", r.data?.length === 0, JSON.stringify(r.data));
r = await second.from("exercises").select("id").is("user_id", null);
check("second account shares the built-in library", r.data?.length >= 60);

r = await second.from("workout_sessions").update({ name: "Hacked" }).eq("id", s.id).select();
check("second account cannot edit the owner's workout", !!r.error || r.data.length === 0);
r = await second.from("workout_sessions").delete().eq("id", s.id).select();
check("second account cannot delete the owner's workout", !!r.error || r.data.length === 0);
r = await second.rpc("delete_workout_session", { p_session_id: s.id });
check("second account cannot delete the owner's workout via RPC", r.error?.code === "P0002", r.error?.code);
r = await second.rpc("save_workout_session", { p_session_id: s.id, p_name: "Hacked", p_notes: "", p_exercises: [] });
check("second account cannot overwrite the owner's workout", r.error?.code === "P0002", r.error?.code);
r = await second.rpc("set_active_plan", { p_plan_id: plan.id, p_active: false });
check("second account cannot change the owner's plan", r.error?.code === "P0002", r.error?.code);
r = await second.from("workout_days").insert({ plan_id: plan.id, name: "Injected", position: 99 });
check("second account cannot add a day to the owner's plan", !!r.error, r.error?.code);
r = await second.from("exercises").select("id").eq("name", "Landmine Press");
check("custom exercise names stay private", r.data?.length === 0);
r = await second.rpc("save_custom_exercise", { p_name: "Landmine Press", p_description: "", p_primary_muscle_group_id: 6, p_secondary_muscle_group_ids: [], p_equipment: "barbell", p_category: "compound" });
check("both accounts can use the same custom name", !r.error, r.error?.message);

// The second account's own workout and records stay separate
const ownerRecords = await owner.from("personal_records").select("record_type, value").eq("exercise_id", builtin.id).order("record_type");
r = await second.rpc("start_workout_session", {});
check("second account can start while the owner has workouts", !r.error, r.error?.message);
const secondSession = r.data;
r = await second.rpc("save_workout_session", { p_session_id: secondSession, p_name: "Mine", p_notes: "", p_exercises: [{ id: uuid(), exercise_id: builtin.id, notes: "", sets: [
  { id: uuid(), weight_kg: 200, reps: 5, rpe: null, is_warmup: false, is_completed: true },
] }] });
r = await second.rpc("finish_workout_session", { p_session_id: secondSession });
check("second account's first log reports no records", !r.error && r.data.length === 0, r.error?.message);
r = await second.from("personal_records").select("value").eq("exercise_id", builtin.id).eq("record_type", "max_weight").single();
check("second account has its own record", Number(r.data?.value) === 200, JSON.stringify(r.data));
r = await owner.from("personal_records").select("record_type, value").eq("exercise_id", builtin.id).order("record_type");
check("owner's records are untouched", JSON.stringify(r.data) === JSON.stringify(ownerRecords.data), JSON.stringify(r.data));
r = await owner.from("workout_sessions").select("id").eq("id", secondSession);
check("owner cannot see the second account's workout", r.data?.length === 0);

// Rest alerts hold a device's push address, so they stay private
const alert = { endpoint: "https://web.push.apple.com/test", p256dh: "key", auth: "secret", ends_at: new Date(Date.now() + 60_000).toISOString(), label: "Bench" };
r = await owner.from("rest_alerts").insert(alert).select().single();
check("owner can schedule a rest alert", !r.error, r.error?.message);
r = await second.from("rest_alerts").select("endpoint");
check("second account cannot see the owner's rest alert", r.data?.length === 0);
r = await second.from("rest_alerts").delete().eq("endpoint", alert.endpoint).select();
check("second account cannot cancel the owner's rest alert", !!r.error || r.data.length === 0);
r = await second.from("rest_alerts").insert({ ...alert, user_id: uid });
check("second account cannot schedule an alert for the owner", !!r.error, r.error?.code);
r = await anon.from("rest_alerts").select("endpoint");
check("anonymous visitors cannot read rest alerts", !!r.error || r.data.length === 0);
r = await owner.from("rest_alerts").delete().eq("endpoint", alert.endpoint).eq("ends_at", alert.ends_at).select();
check("owner's alert is claimed by its exact end time", r.data?.length === 1, r.error?.message);

console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
