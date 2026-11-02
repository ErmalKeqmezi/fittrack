import { LogOut } from "lucide-react";

import { SubmitButton } from "@/components/forms/submit-button";

import { signOut } from "../actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SubmitButton variant="ghost" pendingLabel="Signing out…" className="h-10 w-auto px-3 text-sm">
        <LogOut aria-hidden />
        Sign out
      </SubmitButton>
    </form>
  );
}
