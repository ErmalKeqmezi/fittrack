import { Archive, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { CATEGORY_LABELS, EQUIPMENT_LABELS } from "../constants";
import type { Exercise } from "../types";

export function ExerciseMeta({ exercise }: { exercise: Exercise }) {
  return (
    <span className="text-xs text-muted-foreground">
      {EQUIPMENT_LABELS[exercise.equipment]} · {CATEGORY_LABELS[exercise.category]}
    </span>
  );
}

export function ExerciseStatusBadges({ exercise }: { exercise: Exercise }) {
  return (
    <>
      {exercise.isCustom ? (
        <Badge variant="outline" className="border-primary/40 text-brand-soft">
          <UserRound aria-hidden /> Custom
        </Badge>
      ) : null}
      {exercise.isArchived ? (
        <Badge variant="secondary">
          <Archive aria-hidden /> Archived
        </Badge>
      ) : null}
    </>
  );
}
