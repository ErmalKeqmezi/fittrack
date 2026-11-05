import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { describe, expect, it, vi } from "vitest";

/** Runs the real service worker file and hands back what its push listener does. */
async function deliverPush(data: { json: () => unknown } | null) {
  const listeners = new Map<string, (event: unknown) => void>();
  const showNotification = vi.fn(async () => undefined);
  const self = { addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener), registration: { showNotification } };
  runInNewContext(readFileSync(resolve("public/sw.js"), "utf8"), { self, URL });

  const waits: Promise<unknown>[] = [];
  listeners.get("push")!({ data, waitUntil: (promise: Promise<unknown>) => waits.push(promise) });
  await Promise.all(waits);
  return { showNotification, waits };
}

describe("service worker push", () => {
  it("shows the message it receives and stays alive until shown", async () => {
    const { showNotification, waits } = await deliverPush({ json: () => ({ title: "Rest over", body: "Time for your next set · Bench" }) });
    expect(waits).toHaveLength(1);
    expect(showNotification).toHaveBeenCalledWith("Rest over", expect.objectContaining({ body: "Time for your next set · Bench", tag: "fittrack-rest" }));
  });

  it("always shows something, because iOS cancels subscriptions that stay silent", async () => {
    for (const data of [null, { json: () => { throw new Error("not json"); } }]) {
      const { showNotification } = await deliverPush(data);
      expect(showNotification).toHaveBeenCalledWith("Rest over", expect.objectContaining({ body: "Time for your next set" }));
    }
  });
});
