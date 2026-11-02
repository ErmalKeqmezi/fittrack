import { CloudCheck, CloudOff, Loader2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

import type { SyncStatus } from "../use-tracker-sync";

const LABELS: Record<SyncStatus, string> = {
  saved: "Saved",
  pending: "Saving…",
  saving: "Saving…",
  offline: "Saved on device",
  error: "Not saved",
};

export function SyncIndicator({ status, message }: { status: SyncStatus; message: string | null }) {
  const Icon = status === "saved" ? CloudCheck : status === "offline" ? CloudOff : status === "error" ? TriangleAlert : Loader2;
  return (
    <span
      role="status"
      title={message ?? undefined}
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        status === "error" ? "text-destructive" : status === "offline" ? "text-amber-300" : "text-muted-foreground",
      )}
    >
      <Icon className={cn("size-3.5", (status === "saving" || status === "pending") && "animate-spin")} aria-hidden />
      {LABELS[status]}
    </span>
  );
}
