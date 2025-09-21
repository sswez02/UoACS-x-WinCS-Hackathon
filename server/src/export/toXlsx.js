import ExcelJS from "exceljs";

function coercePlan(p = {}) {
  return {
    profile: p.profile ?? {},
    week: Array.isArray(p.week) ? p.week : [],
    meals: Array.isArray(p.meals) ? p.meals : [],
    targets: p.targets ?? { kcal: "", protein_g: "", carbs_g: "", fat_g: "" },
    citations: Array.isArray(p.citations) ? p.citations : [],
  };
}

export async function writeXlsx(plan, outPath) {
  const safe = coercePlan(plan);
  const wb = new ExcelJS.Workbook();

  // Workout
  const ws = wb.addWorksheet("Workout");
  ws.addRow(["Day","Session Type","Exercise","Sets","Reps","RPE","Rest (s)","Notes"]);
  for (const d of safe.week) {
    const day = d?.day ?? "";
    for (const s of (d?.sessions ?? [])) {
      const type = s?.type ?? "";
      for (const b of (s?.blocks ?? [])) {
        ws.addRow([
          day, type, b?.name ?? "", b?.sets ?? "", b?.reps ?? "",
          b?.rpe ?? "", b?.rest_sec ?? "", b?.notes ?? ""
        ]);
      }
    }
  }

  // Meals
  const ms = wb.addWorksheet("Meals");
  ms.addRow(["Meal","kcal","Protein (g)","Carbs (g)","Fat (g)","Items"]);
  for (const m of safe.meals) {
    ms.addRow([
      m?.name ?? "", m?.kcal ?? "", m?.protein_g ?? "",
      m?.carbs_g ?? "", m?.fat_g ?? "", (m?.items ?? []).join("; ")
    ]);
  }

  // Targets
  const ts = wb.addWorksheet("Targets");
  ts.addRow(["kcal","Protein (g)","Carbs (g)","Fat (g)"]);
  ts.addRow([
    safe.targets?.kcal ?? "", safe.targets?.protein_g ?? "",
    safe.targets?.carbs_g ?? "", safe.targets?.fat_g ?? ""
  ]);
  const ps = wb.addWorksheet("Progression");
  ps.addRow(["Rule", "Details"]);
  ps.addRow(["Add reps", "If RPE ≤ 7 and all sets completed, add +1 rep next session until top of range."]);
  ps.addRow(["Add load", "After hitting top of range for all sets twice, add ~2.5–5% load and reset to lower reps."]);
  ps.addRow(["Autoregulate", "Stay in RPE 6–8. If too hard, reduce reps or load."]);
  // Citations
  const cs = wb.addWorksheet("Citations");
  cs.addRow(["Title","DOI","Year","PMID"]);
  for (const c of safe.citations) {
    cs.addRow([c?.title ?? "", c?.doi ?? "", c?.year ?? "", c?.pmid ?? ""]);
  }

  await wb.xlsx.writeFile(outPath);
}
