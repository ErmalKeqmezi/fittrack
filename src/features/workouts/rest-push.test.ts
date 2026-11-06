import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_VAPID_PUBLIC_KEY: "AQAB" } }));
vi.mock("./rest-alert", () => ({ getRestAlertPrefs: () => ({ notify: true }) }));

const NOW = 1_800_000_000_000;
const END = NOW + 60_000;

/** A fresh copy of the module, since it remembers what's scheduled. */
async function setup(status = 202) {
  vi.resetModules();
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<{ status: number }>>(async () => ({ status }));
  const subscription = { endpoint: "https://web.push.apple.com/a", toJSON: () => ({ endpoint: "https://web.push.apple.com/a" }) };
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("Notification", { permission: "granted" });
  vi.stubGlobal("window", { PushManager: class {} });
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => ({ pushManager: { getSubscription: async () => subscription } }) } });
  const push = await import("./rest-push");
  const methods = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return fetchMock.mock.calls.map(([, init]) => init.method);
  };
  return { ...push, methods };
}

describe("syncRestPush", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("schedules once when the rest starts, even if the app is open", async () => {
    const { syncRestPush, isRestPushScheduled, methods } = await setup();
    syncRestPush(END, "Bench", true, NOW);
    syncRestPush(END, "Bench", false, NOW + 1_000);
    syncRestPush(END, "Bench", true, NOW + 2_000);
    expect(await methods()).toEqual(["POST"]);
    expect(isRestPushScheduled()).toBe(true);
  });

  it("cancels near the end while the app is on screen", async () => {
    const { syncRestPush, isRestPushScheduled, methods } = await setup();
    syncRestPush(END, "Bench", true, NOW);
    syncRestPush(END, "Bench", true, END - 5_000);
    expect(await methods()).toEqual(["POST", "DELETE"]);
    expect(isRestPushScheduled()).toBe(false);
  });

  it("keeps the alert near the end when the app is in the background", async () => {
    const { syncRestPush, methods } = await setup();
    syncRestPush(END, "Bench", true, NOW);
    syncRestPush(END, "Bench", false, END - 5_000);
    expect(await methods()).toEqual(["POST"]);
  });

  it("schedules again when leaving the app in the last seconds", async () => {
    const { syncRestPush, isRestPushScheduled, methods } = await setup();
    syncRestPush(END, "Bench", true, NOW);
    syncRestPush(END, "Bench", true, END - 5_000);
    syncRestPush(END, "Bench", false, END - 3_000);
    expect(await methods()).toEqual(["POST", "DELETE", "POST"]);
    expect(isRestPushScheduled()).toBe(true);
  });

  it("schedules again when the rest length changes", async () => {
    const { syncRestPush, methods } = await setup();
    syncRestPush(END, "Bench", true, NOW);
    syncRestPush(END + 15_000, "Bench", true, NOW + 1_000);
    expect(await methods()).toEqual(["POST", "POST"]);
  });

  it("does nothing once the rest is over", async () => {
    const { syncRestPush, methods } = await setup();
    syncRestPush(END, "Bench", false, END);
    expect(await methods()).toEqual([]);
  });

  it("lets the page notify instead when the server didn't accept the alert", async () => {
    const { syncRestPush, isRestPushScheduled, methods } = await setup(503);
    syncRestPush(END, "Bench", false, NOW);
    await methods();
    expect(isRestPushScheduled()).toBe(false);
  });
});
