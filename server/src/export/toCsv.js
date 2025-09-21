import fs from "fs";
import { format } from "@fast-csv/format";

function coercePlan(p = {}) {
  return {
    week: Array.isArray(p.week) ? p.week : [],
  };
}

export async function writeCsv(plan, outPath) {
  const safe = coercePlan(plan);
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(outPath);
    const csv = format({ headers: true });
    csv.pipe(ws).on("finish", resolve).on("error", reject);

    for (const d of safe.week) {
      const day = d?.day ?? "";
      for (const s of (d?.sessions ?? [])) {
        const type = s?.type ?? "";
        for (const b of (s?.blocks ?? [])) {
          csv.write({
            day,
            session: type,
            exercise: b?.name ?? "",
            sets: b?.sets ?? "",
            reps: b?.reps ?? "",
            rpe: b?.rpe ?? "",
            rest_sec: b?.rest_sec ?? "",
            notes: b?.notes ?? ""
          });
        }
      }
    }
    csv.end();
  });
}
