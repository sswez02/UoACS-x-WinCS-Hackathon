import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { synthesizePlan } from "../gen/synthesize.js";
import { writeXlsx } from "../export/toXlsx.js";
import { writeCsv } from "../export/toCsv.js";
import { retrieveTopK } from "../rag/retrieve.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router(); // <— create the router

// --- add near top of routes/generate.js ---
function ensureMinimumPlan(plan, input = {}) {
  const safe = obj => (obj && typeof obj === 'object' ? obj : {});
  plan = safe(plan);

  // Profile
  plan.profile = safe(plan.profile);

  // Targets (basic TDEE-ish calc)
  const w = Number(input.weight_kg || 70);
  const h = Number(input.height_cm || 170);
  const age = Number(input.age || 25);
  const sex = (input.sex || "Male").toLowerCase();
  const bmr = sex === "female"
    ? 10 * w + 6.25 * h - 5 * age - 161
    : 10 * w + 6.25 * h - 5 * age + 5;
  // light-moderate activity if training 3–4d
  const tdee = Math.round(bmr * 1.45);

  // Use model targets if present; otherwise create
  const tg = safe(plan.targets);
  plan.targets = {
    kcal: tg.kcal ?? tdee,
    protein_g: tg.protein_g ?? Math.round(w * 1.8),
    carbs_g: tg.carbs_g ?? Math.round((tdee * 0.45) / 4),
    fat_g: tg.fat_g ?? Math.round((tdee * 0.30) / 9),
  };

  // Week: ensure at least 3 days with 2 blocks per session
  if (!Array.isArray(plan.week) || plan.week.length === 0) {
    const days = (String(input.days_per_week || "3").match(/\d+/)?.[0] ?? 3);
    // inside ensureMinimumPlan(), replace the template with:
    const template = [
      { day: "Mon", sessions: [{ type: "Strength", blocks: [
        { name: "Warm-up: 5–8 min brisk walk or bike", sets: "", reps: "", notes: "Light sweat" },
        { name: "Goblet Squat", sets: 3, reps: "8–10", rpe: 7, rest_sec: 90 },
        { name: "DB Bench Press", sets: 3, reps: "8–10", rpe: 7, rest_sec: 90 },
        { name: "Hip Hinge: RDL (light)", sets: 2, reps: "10–12", rpe: 6, rest_sec: 90 },
        { name: "Core: Side Plank (each)", sets: 2, reps: "30–40s", rpe: 7, rest_sec: 60 },
      ]}]},
      { day: "Wed", sessions: [{ type: "Strength", blocks: [
        { name: "Warm-up: 5–8 min bike + dynamic mobility", sets: "", reps: "", notes: "Hips/shoulders" },
        { name: "Romanian Deadlift", sets: 3, reps: "8–10", rpe: 7, rest_sec: 120 },
        { name: "Lat Pulldown", sets: 3, reps: "10–12", rpe: 7, rest_sec: 90 },
        { name: "DB Split Squat", sets: 2, reps: "10–12", rpe: 7, rest_sec: 90 },
        { name: "Core: Dead Bug", sets: 2, reps: "8–10/side", rpe: 6, rest_sec: 60 },
      ]}]},
      { day: "Fri", sessions: [{ type: "Strength", blocks: [
        { name: "Warm-up: 5–8 min jog/row", sets: "", reps: "", notes: "Easy" },
        { name: "Split Squat", sets: 3, reps: "8–10", rpe: 7, rest_sec: 90 },
        { name: "Seated Row", sets: 3, reps: "10–12", rpe: 7, rest_sec: 90 },
        { name: "DB Overhead Press", sets: 2, reps: "10–12", rpe: 7, rest_sec: 90 },
        { name: "Optional: 8–10 min Zone 2 cardio", sets: "", reps: "", notes: "Cool-down" },
      ]}]},
    ];

    plan.week = template.slice(0, Math.max(3, Number(days)));
  }

  // Meals: ensure at least 3
  if (!Array.isArray(plan.meals) || plan.meals.length === 0) {
    const P = plan.targets.protein_g;
    const K = plan.targets.kcal;
    const per = [0.28, 0.34, 0.38];
    const proteinSplit = [0.33, 0.34, 0.33];

    plan.meals = ["Breakfast","Lunch","Dinner"].map((name, i) => ({
      name,
      kcal: Math.round(K * per[i]),
      protein_g: Math.round(P * proteinSplit[i]),
      carbs_g: "", // optional: compute later
      fat_g: "",   // optional: compute later
      items: name === "Breakfast"
        ? ["Oats 80g","Milk 200ml","Whey 30g","Banana"]
        : name === "Lunch"
          ? ["Chicken 150g","Rice 200g cooked","Veg"]
          : ["Beef mince 150g","Pasta 200g cooked","Sauce"]
    }));

  }

  // Citations: ensure array
  if (!Array.isArray(plan.citations)) {
    plan.citations = [{ title: "Seed evidence (volume-equated split vs full-body ~ similar outcomes)", year: 2022 }];
  }
  return plan;
}


// health-y ping for this router
router.get("/ping", (_req, res) => res.json({ pong: true }));

// --- debug endpoints ---
router.get("/debug/ollama", async (_req, res) => {
  try {
    const r = await fetch((process.env.OLLAMA_URL || "http://localhost:11434") + "/api/tags");
    const j = await r.json();
    res.json({ ok: true, models: j.models?.map(m => m.name) ?? [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.get("/debug/rag", async (_req, res) => {
  try {
    const ctx = await retrieveTopK({ goal: "General strength", experience: "Beginner" }, 3);
    res.json({ ok: true, chunks: ctx.length, sample: ctx[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- temporary stub to prove export works even if model fails ---
router.post("/generate/test", async (req, res) => {
  try {
    const input = req.body || {};
    const plan = {
      profile: { ...input, note: "stubbed plan" },
      week: [{ day: "Mon", sessions: [{ type: "Strength", blocks: [{ name:"Squat", sets:3, reps:"8-10" }]}]}],
      meals: [{ name: "Breakfast", kcal: 500, protein_g: 35, carbs_g: 55, fat_g: 15, items: ["Oats","Milk","Whey"] }],
      targets: { kcal: 1800, protein_g: 110, carbs_g: 200, fat_g: 60 },
      citations: [{ title: "Seed evidence", year: 2022 }]
    };

    const outDir = path.join(__dirname, "../../public");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const stamp = Date.now();
    const xlsx = `weekly_plan_${stamp}.xlsx`;
    const csv  = `weekly_plan_${stamp}.csv`;

    await writeXlsx(plan, path.join(outDir, xlsx));
    await writeCsv(plan,  path.join(outDir, csv));

    res.json({ xlsx: `/files/${xlsx}`, csv: `/files/${csv}` });
  } catch (e) {
    console.error("STUB export failed:", e);
    res.status(500).json({ error: "Stub export failed" });
  }
});

// --- real generator ---
router.post("/generate", async (req, res) => {
  try {
    const input = req.body || {};

    // Directly build the plan (no AI call)
    let plan = ensureMinimumPlan({}, input);

    const outDir = path.join(__dirname, "../../public");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const stamp = Date.now();
    const xlsx = `weekly_plan_${stamp}.xlsx`;
    const csv  = `weekly_plan_${stamp}.csv`;

    await writeXlsx(plan, path.join(outDir, xlsx));
    await writeCsv(plan,  path.join(outDir, csv));

    // Respond immediately with file links
    res.json({
      ok: true,
      xlsx: `/files/${xlsx}`,
      csv: `/files/${csv}`,
      profile: plan.profile,
      targets: plan.targets
    });
  } catch (err) {
    console.error("MVP export failed:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});



export { router }; // <— named export (what index.js imports)
