"use client";

import { NotebookText } from "lucide-react";
import { useTransition, useState } from "react";
import { toast } from "sonner";

import { Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { saveSessionNotes } from "../../actions";

const MAX_NOTES = 2000;

/** Notes live on the session itself. What was typed stays in the box if saving fails. */
export function SessionNotes({ sessionId, initial }: { sessionId: string; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const dirty = notes.trim() !== saved.trim();

  function save() {
    startTransition(async () => {
      const result = await saveSessionNotes(sessionId, notes).catch(() => ({
        ok: false as const,
        message: "No connection. Your notes are still here; try again when online.",
      }));
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSaved(notes);
      toast.success(result.message ?? "Notes saved.");
    });
  }

  return (
    <Panel>
      <PanelHeader title="Session notes" icon={NotebookText} />
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={MAX_NOTES}
        rows={3}
        aria-label="Session notes"
        placeholder="How did it feel? Anything to remember next time?"
        className="min-h-24 text-base md:text-sm"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground tabular-nums">{notes.length} / {MAX_NOTES.toLocaleString("en-GB")}</p>
        <Button type="button" variant="outline" onClick={save} disabled={!dirty || pending} className="h-11 rounded-xl px-4">
          {pending ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </Panel>
  );
}
