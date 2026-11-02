import { expect, test, type Page } from "@playwright/test";

const OWNER = { name: "E2E Owner", email: "e2e-owner@fittrack.test", password: "E2ePassword123" };

test.describe.configure({ mode: "serial" });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page.close();
});

/** Fills one set row: weight, reps, then ✓. */
async function logSet(exerciseName: string, row: number, weight: string, reps: string) {
  const table = page.getByRole("table", { name: `${exerciseName} sets` });
  const setRow = table.getByRole("row").nth(row + 1); // row 0 is the header
  await setRow.getByLabel("Weight in kg").fill(weight);
  await setRow.getByLabel("Repetitions").fill(reps);
  await setRow.getByRole("button", { name: "Mark set as completed" }).click();
  await expect(setRow.getByRole("button", { name: "Completed, tap to undo" })).toBeVisible();
}

async function addExercise(name: string) {
  await page.getByRole("button", { name: "Add exercise" }).click();
  const dialog = page.getByRole("dialog", { name: "Add exercises" });
  await dialog.getByLabel("Search exercises").fill(name);
  await dialog.getByRole("button", { name: new RegExp(`^${name}`) }).first().click();
  await dialog.getByRole("button", { name: /^Add 1 exercise/ }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

async function finishWorkout() {
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByRole("dialog", { name: "Finish workout?" }).getByRole("button", { name: "Finish workout" }).click();
  await expect(page.getByRole("link", { name: "Workout history" })).toBeVisible();
}

test("signed-out visitors are sent to login", async () => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await expect(page.getByRole("link", { name: "Set up FitTrack" })).toBeVisible();
});

test("first-time setup creates the owner and closes registration", async () => {
  await page.goto("/setup");
  await page.getByLabel("Your name").fill(OWNER.name);
  await page.getByLabel("Email").fill(OWNER.email);
  await page.getByLabel("Password", { exact: true }).fill(OWNER.password);
  await page.getByLabel("Confirm password").fill(OWNER.password);
  await page.getByRole("button", { name: "Create owner account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(OWNER.name);

  // Registration is closed for everyone else.
  const fresh = await page.context().browser()!.newPage();
  await fresh.goto("/setup");
  await expect(fresh).toHaveURL(/\/login/);
  await expect(fresh.getByRole("link", { name: "Set up FitTrack" })).toHaveCount(0);
  await fresh.close();
});

test("logs a workout and finds it in history", async () => {
  await page.goto("/workout");
  await page.getByRole("button", { name: "Start empty workout" }).click();
  await expect(page).toHaveURL(/\/workouts\//);
  await addExercise("Barbell Bench Press");
  await expect(page.getByText("First time logging this exercise.")).toBeVisible();

  await logSet("Barbell Bench Press", 0, "70", "10");
  await expect(page.getByRole("timer")).toBeVisible(); // rest timer started
  await page.getByRole("button", { name: "Skip rest" }).click();
  await page.getByRole("button", { name: "Add set" }).click();
  await logSet("Barbell Bench Press", 1, "70", "8");
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({ timeout: 15_000 });

  // Survives a reload mid-workout.
  await page.reload();
  await expect(page.getByRole("table", { name: "Barbell Bench Press sets" }).getByRole("button", { name: "Completed, tap to undo" })).toHaveCount(2);

  await finishWorkout();
  await expect(page.getByText("1,260 kg", { exact: true })).toBeVisible(); // 70×10 + 70×8 in the summary

  await page.goto("/history");
  await expect(page.getByText("1 completed workout")).toBeVisible();
});

test("the next workout shows last time and reports a new record", async () => {
  await page.goto("/workout");
  await page.getByRole("button", { name: "Start empty workout" }).click();
  await addExercise("Barbell Bench Press");
  await expect(page.getByText(/Last time · .*: 70×10, 70×8/)).toBeVisible();

  const firstRow = page.getByRole("table", { name: "Barbell Bench Press sets" }).getByRole("row").nth(1);
  await expect(firstRow.getByLabel("Weight in kg")).toHaveAttribute("placeholder", "70");
  await logSet("Barbell Bench Press", 0, "75", "8");
  await page.getByRole("button", { name: "Skip rest" }).click();

  await finishWorkout();
  await expect(page.getByText(/New PR · Barbell Bench Press/).first()).toBeVisible();
  await expect(page.getByTitle(/Current personal record/)).toBeVisible();
});

test("progress and records reflect the logged sets", async () => {
  await page.goto("/progress/records");
  await expect(page.getByText("75 kg").first()).toBeVisible();

  await page.goto("/progress?range=30d");
  const exerciseLink = page.getByRole("link", { name: /Barbell Bench Press/ });
  await expect(exerciseLink).toBeVisible();
  await exerciseLink.click();
  await expect(page.getByRole("heading", { name: "Barbell Bench Press" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "All-time records" })).toBeVisible();
  await expect(page.getByText("75 kg", { exact: true }).first()).toBeVisible();
});

test("a plan template becomes today's workout when activated", async () => {
  await page.goto("/plans");
  await page.getByRole("button", { name: "Use this template" }).first().click();
  await expect(page).toHaveURL(/\/plans\/[0-9a-f-]+$/);
  await page.getByRole("button", { name: "Set as active plan" }).click();
  await expect(page.getByRole("button", { name: "Deactivate" })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Today's workout" })).toBeVisible();
});

test("is installable: manifest and icons are served", async () => {
  const response = await page.request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: "FitTrack", display: "standalone", start_url: "/dashboard" });
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await page.request.get(icon.src)).ok()).toBe(true);
  }
  const sw = await page.request.get("/sw.js");
  expect(sw.headers()["cache-control"]).toContain("no-cache");
});

test("a visited page still loads offline; others show the offline page", async () => {
  await page.goto("/history");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Load once more under the active service worker so the page is cached.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Workout history" })).toBeVisible();

  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Workout history" })).toBeVisible();
  await page.goto("/exercises/new").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await page.context().setOffline(false);
});

test("sets logged without a connection sync when it returns", async () => {
  await page.goto("/workout");
  await page.getByRole("button", { name: "Start empty workout" }).click();
  await expect(page).toHaveURL(/\/workouts\//);
  await addExercise("Back Squat");

  await page.context().setOffline(true);
  await logSet("Back Squat", 0, "100", "5");
  await expect(page.getByRole("status").filter({ hasText: "Saved on device" })).toBeVisible({ timeout: 15_000 });

  await page.context().setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible({ timeout: 15_000 });

  // The server has the set: a fresh load shows it as completed.
  await page.reload();
  await expect(page.getByRole("table", { name: "Back Squat sets" }).getByRole("button", { name: "Completed, tap to undo" })).toHaveCount(1);
  await page.getByRole("button", { name: "Discard workout" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard workout" }).click();
  await expect(page).toHaveURL(/\/workout$/);
});

test("signing out protects the app again", async () => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/history");
  await expect(page).toHaveURL(/\/login/);
  // Private pages cached for offline use were cleared.
  const cached = await page.evaluate(async () => {
    const name = (await caches.keys()).find((k) => k.startsWith("fittrack-pages"));
    return name ? (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname) : [];
  });
  expect(cached.filter((path) => path !== "/login")).toEqual([]);
});
