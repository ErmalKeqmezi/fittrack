"use client";

import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

import { deleteExercise, setExerciseArchived } from "../actions";

/** Edit / archive / delete controls, shown only for the user's custom exercises. */
export function ExerciseOwnerActions({ exerciseId, name, isArchived }: { exerciseId: string; name: string; isArchived: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggleArchived() {
    startTransition(async () => {
      const result = await setExerciseArchived(exerciseId, !isArchived);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function remove() {
    startTransition(async () => {
      // Redirects to the library on success.
      const result = await deleteExercise(exerciseId);
      if (!result.ok) toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" className="h-11 rounded-xl px-4">
        <Link href={`${routes.exercises}/${exerciseId}/edit`}>
          <Pencil aria-hidden /> Edit
        </Link>
      </Button>
      <Button variant="outline" className="h-11 rounded-xl px-4" disabled={pending} onClick={toggleArchived}>
        {isArchived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
        {isArchived ? "Restore" : "Archive"}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="h-11 rounded-xl px-4" disabled={pending}>
            <Trash2 aria-hidden /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the exercise. Exercises used in plans or logged workouts cannot be
              deleted. Archive them to hide them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Delete exercise
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
