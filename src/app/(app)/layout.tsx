import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireUser } from "@/features/auth/queries";

// Phase 1 shell. Phase 2 replaces this header with the desktop sidebar and mobile bottom navigation.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Logo />
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
