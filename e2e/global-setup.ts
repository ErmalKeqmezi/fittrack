import { execSync } from "node:child_process";

/** Starts every run from an empty local database (the account limit is global). */
export default function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
    throw new Error(`Refusing to reset a non-local Supabase (${url}).`);
  }
  execSync("npx supabase db reset", { stdio: "inherit" });
}
