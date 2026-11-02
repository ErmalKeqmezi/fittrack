import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(155,109,255,0.18),transparent_65%)]"
      />
      <div className="relative w-full max-w-sm">
        <Logo className="mb-8 justify-center" />
        {children}
      </div>
    </main>
  );
}
