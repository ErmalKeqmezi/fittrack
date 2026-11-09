"use client";

import { SkipForward } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateKey, toDateKey } from "@/lib/dates";
import { formatVolume } from "@/lib/format";

import type { SkipImpact } from "../skip";

function list(names: string[]) {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Explains what skipping costs; nothing changes until "Skip for today". */
export function SkipExerciseDialog({
  impact,
  planName,
  timeZone,
  onConfirm,
  onClose,
}: {
  impact: SkipImpact | null;
  planName: string | null;
  timeZone: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={impact !== null} onOpenChange={(open) => (open ? null : onClose())}>
      {impact ? (
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Skip {impact.name} today?</DialogTitle>
            <DialogDescription>Here&apos;s what changes. Nothing happens until you confirm.</DialogDescription>
          </DialogHeader>

          <ul className="grid gap-2.5 text-sm">
            <li className="rounded-xl bg-secondary/60 px-3 py-2.5">
              <p className="font-medium">This workout only</p>
              <p className="text-muted-foreground">
                It&apos;s removed from today&apos;s session. {planName ? `Your ${planName} plan isn't changed, so it's there next time.` : "Nothing else is changed."}
              </p>
            </li>

            {impact.muscle ? (
              <li className="rounded-xl bg-secondary/60 px-3 py-2.5">
                <p className="font-medium">{impact.muscle}</p>
                <p className="text-muted-foreground">
                  {impact.sameMuscle.length
                    ? `Still trained today by ${list(impact.sameMuscle)}.`
                    : impact.lightly.length
                      ? `No other exercise today mainly trains it. ${list(impact.lightly)} ${impact.lightly.length === 1 ? "works" : "work"} it lightly.`
                      : "No other exercise today trains it."}
                </p>
              </li>
            ) : null}

            <li className="rounded-xl bg-secondary/60 px-3 py-2.5">
              <p className="font-medium">Volume</p>
              <p className="text-muted-foreground">
                {impact.lastVolumeKg !== null && impact.lastDate
                  ? `Last time (${formatDateKey(toDateKey(impact.lastDate, timeZone), { day: "numeric", month: "short" })}) it added ${formatVolume(impact.lastVolumeKg)}, so today's total will be lower than usual.`
                  : "You haven't logged it before, so there's nothing to compare."}
              </p>
            </li>

            {impact.doneSets ? (
              <li className="rounded-xl border border-destructive/40 px-3 py-2.5">
                <p className="font-medium">Completed sets</p>
                <p className="text-muted-foreground">
                  The {impact.doneSets} {impact.doneSets === 1 ? "set" : "sets"} you&apos;ve done on it are removed too.
                </p>
              </li>
            ) : null}
          </ul>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" className="h-11 rounded-xl" onClick={onClose}>
              Keep it
            </Button>
            <Button className="h-11 rounded-xl px-5" onClick={onConfirm}>
              <SkipForward aria-hidden /> Skip for today
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
