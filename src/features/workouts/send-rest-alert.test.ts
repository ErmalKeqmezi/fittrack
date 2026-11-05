import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Database } from "@/types/database";

import { deliverRestAlert } from "./send-rest-alert";

const job = { accessToken: "token", userId: "user", endpoint: "https://web.push.apple.com/a", endsAt: Date.now() + 60_000 };
const row = { endpoint: job.endpoint, p256dh: "key", auth: "secret", label: "Bench" };

/** `pending` is what the first check finds, `claimed` what the delete returns when the rest ends. */
function fakeClient(pending: unknown, claimed: unknown) {
  const query = (result: unknown) => {
    const chain = { select: () => chain, match: () => chain, delete: () => chain, maybeSingle: async () => ({ data: result }) };
    return chain;
  };
  const from = vi.fn().mockReturnValueOnce(query(pending)).mockReturnValueOnce(query(claimed));
  return { from } as unknown as SupabaseClient<Database>;
}

describe("deliverRestAlert", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public");
    vi.stubEnv("VAPID_PRIVATE_KEY", "private");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://fittrack.test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends once the rest has ended", async () => {
    const wait = vi.fn(async () => undefined);
    const send = vi.fn(async () => ({}) as never);
    await deliverRestAlert(job, { client: fakeClient(row, row), wait, send });
    expect(wait).toHaveBeenCalledOnce();
    expect((wait.mock.calls[0] as unknown as [number])[0]).toBeGreaterThan(59_000);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]).toEqual([
      { endpoint: job.endpoint, keys: { p256dh: "key", auth: "secret" } },
      JSON.stringify({ title: "Rest over", body: "Time for your next set · Bench" }),
      expect.objectContaining({ TTL: 60, urgency: "high" }),
    ]);
  });

  it("stops before waiting without a valid token or matching alert", async () => {
    const wait = vi.fn(async () => undefined);
    const send = vi.fn(async () => ({}) as never);
    await deliverRestAlert(job, { client: fakeClient(null, null), wait, send });
    expect(wait).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("sends nothing if the rest was skipped or changed while waiting", async () => {
    const send = vi.fn(async () => ({}) as never);
    await deliverRestAlert(job, { client: fakeClient(row, null), wait: async () => undefined, send });
    expect(send).not.toHaveBeenCalled();
  });

  it("does not throw when the push fails, so Netlify doesn't retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const send = vi.fn(async () => {
      throw Object.assign(new Error("gone"), { statusCode: 410 });
    });
    await expect(deliverRestAlert(job, { client: fakeClient(row, row), wait: async () => undefined, send })).resolves.toBeUndefined();
  });
});
