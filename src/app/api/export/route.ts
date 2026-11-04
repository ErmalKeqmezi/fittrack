import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/features/auth/queries";
import { buildSetRows, SET_HEADERS, toCsv, type ExportSession, type ExportSessionExercise, type ExportSet } from "@/features/export/csv";
import { loadExportTables } from "@/features/export/queries";
import { toDateKey } from "@/lib/dates";

function download(body: string, contentType: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Private data: never store in a shared or browser cache.
      "Cache-Control": "private, no-store",
    },
  });
}

/** Downloads the signed-in user's data. Row Level Security scopes every query. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const format = request.nextUrl.searchParams.get("format");
  if (format !== "csv" && format !== "json") {
    return NextResponse.json({ error: "Use format=csv or format=json." }, { status: 400 });
  }

  try {
    const tables = await loadExportTables();
    const date = toDateKey(new Date(), user.timeZone);

    if (format === "csv") {
      const rows = buildSetRows(
        tables.workout_sessions as ExportSession[],
        tables.session_exercises as ExportSessionExercise[],
        tables.exercise_sets as ExportSet[],
        user.timeZone,
      );
      return download(toCsv(SET_HEADERS, rows), "text/csv; charset=utf-8", `fittrack-workouts-${date}.csv`);
    }

    const backup = { app: "FitTrack", format_version: 1, exported_at: new Date().toISOString(), tables };
    return download(JSON.stringify(backup, null, 2), "application/json; charset=utf-8", `fittrack-backup-${date}.json`);
  } catch {
    return NextResponse.json({ error: "The export failed. Try again." }, { status: 500 });
  }
}
