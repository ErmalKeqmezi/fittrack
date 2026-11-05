import { describe, expect, it } from "vitest";

import { cancelRestAlertSchema, isPushEndpoint, restAlertPayload, scheduleRestAlertSchema } from "./rest-alert-request";

describe("isPushEndpoint", () => {
  it("accepts the browser push services", () => {
    for (const url of [
      "https://web.push.apple.com/abc",
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) {
      expect(isPushEndpoint(url)).toBe(true);
    }
  });

  it("rejects anything else the server could be pointed at", () => {
    for (const url of [
      "http://web.push.apple.com/abc",
      "https://web.push.apple.com.evil.test/abc",
      "https://evil-push.services.mozilla.com/abc",
      "https://169.254.169.254/latest",
      "https://localhost/abc",
      "not a url",
    ]) {
      expect(isPushEndpoint(url)).toBe(false);
    }
  });
});

describe("request validation", () => {
  const valid = { subscription: { endpoint: "https://web.push.apple.com/abc", keys: { p256dh: "key", auth: "secret" } }, endsAt: 1_800_000_000_000, label: "Bench" };

  it("accepts a well-formed request", () => {
    expect(scheduleRestAlertSchema.safeParse(valid).success).toBe(true);
    expect(cancelRestAlertSchema.safeParse({ endpoint: valid.subscription.endpoint }).success).toBe(true);
  });

  it("rejects other hosts, missing keys and overlong labels", () => {
    expect(scheduleRestAlertSchema.safeParse({ ...valid, subscription: { ...valid.subscription, endpoint: "https://evil.test/a" } }).success).toBe(false);
    expect(scheduleRestAlertSchema.safeParse({ ...valid, subscription: { endpoint: valid.subscription.endpoint } }).success).toBe(false);
    expect(scheduleRestAlertSchema.safeParse({ ...valid, label: "x".repeat(201) }).success).toBe(false);
    expect(cancelRestAlertSchema.safeParse({ endpoint: "https://evil.test/a" }).success).toBe(false);
  });
});

describe("restAlertPayload", () => {
  it("names the exercise when there is one", () => {
    expect(JSON.parse(restAlertPayload("Bench"))).toEqual({ title: "Rest over", body: "Time for your next set · Bench" });
    expect(JSON.parse(restAlertPayload(""))).toEqual({ title: "Rest over", body: "Time for your next set" });
  });
});
