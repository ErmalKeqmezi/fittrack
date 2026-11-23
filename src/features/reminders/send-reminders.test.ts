import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Database } from "@/types/database";

import { reminderText, sendWorkoutReminders } from "./send-reminders";

const due = (endpoint: string, name: string | null = "Ermal Keqmezi") => ({ user_id: "u", display_name: name, endpoint, p256dh: "k", auth: "a" });

function fakeClient(rows: unknown[] | null, error: { message: string } | null = null) {
  const rpc = vi.fn(async (name: string) => (name === "claim_workout_reminders" ? { data: rows, error } : { data: null, error: null }));
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe("reminderText", () => {
  it("greets by first name, or generically without one", () => {
    expect(reminderText("Ermal Keqmezi")).toBe("Hey Ermal, don't forget to work out today");
    expect(reminderText("  ")).toBe("Hey there, don't forget to work out today");
    expect(reminderText(null)).toBe("Hey there, don't forget to work out today");
  });
});

describe("sendWorkoutReminders", () => {
  beforeEach(() => {
    vi.stubEnv("WORKOUT_REMINDER_SECRET", "s".repeat(40));
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public");
    vi.stubEnv("VAPID_PRIVATE_KEY", "private");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://fittrack.test");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends one notification per device that is due", async () => {
    const { client, rpc } = fakeClient([due("https://web.push.apple.com/a"), due("https://fcm.googleapis.com/b")]);
    const send = vi.fn(async () => ({}) as never);
    expect(await sendWorkoutReminders({ client, send })).toEqual({ sent: 2, failed: 0 });
    expect(rpc).toHaveBeenCalledWith("claim_workout_reminders", { p_secret: "s".repeat(40) });
    expect(send.mock.calls[0]).toEqual([
      { endpoint: "https://web.push.apple.com/a", keys: { p256dh: "k", auth: "a" } },
      JSON.stringify({ title: "FitTrack", body: "Hey Ermal, don't forget to work out today", tag: "fittrack-reminder", url: "/workout" }),
      expect.objectContaining({ TTL: 3600 }),
    ]);
  });

  it("forgets devices the push service says are gone, and keeps going", async () => {
    const { client, rpc } = fakeClient([due("https://web.push.apple.com/gone"), due("https://web.push.apple.com/ok")]);
    const send = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }))
      .mockResolvedValueOnce({});
    expect(await sendWorkoutReminders({ client, send })).toEqual({ sent: 1, failed: 1 });
    expect(rpc).toHaveBeenCalledWith("remove_push_subscription", { p_secret: "s".repeat(40), p_endpoint: "https://web.push.apple.com/gone" });
  });

  it("keeps devices after a temporary failure", async () => {
    const { client, rpc } = fakeClient([due("https://web.push.apple.com/a")]);
    const send = vi.fn().mockRejectedValueOnce(Object.assign(new Error("busy"), { statusCode: 503 }));
    await sendWorkoutReminders({ client, send });
    expect(rpc).not.toHaveBeenCalledWith("remove_push_subscription", expect.anything());
  });

  it("does nothing without its configuration or when the database refuses", async () => {
    const send = vi.fn();
    vi.stubEnv("WORKOUT_REMINDER_SECRET", "");
    expect(await sendWorkoutReminders({ client: fakeClient([due("x")]).client, send })).toEqual({ sent: 0, failed: 0 });
    vi.stubEnv("WORKOUT_REMINDER_SECRET", "s".repeat(40));
    expect(await sendWorkoutReminders({ client: fakeClient(null, { message: "not allowed" }).client, send })).toEqual({ sent: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
  });
});
