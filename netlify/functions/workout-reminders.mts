import type { Config } from "@netlify/functions";

import { sendWorkoutReminders } from "../../src/features/reminders/send-reminders";

/** Every 5 minutes: sends the daily workout reminders that are due. */
export default async function handler() {
  const result = await sendWorkoutReminders();
  if (result.sent || result.failed) console.log(`Workout reminders: ${result.sent} sent, ${result.failed} failed.`);
}

export const config: Config = { schedule: "*/5 * * * *" };
