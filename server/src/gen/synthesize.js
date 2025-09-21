import { retrieveTopK } from "../rag/retrieve.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL      = process.env.LOCAL_MODEL || "llama3.1:8b-instruct-q4_K_M";

function ctxBlock(ctx) {
  return ctx.map(c =>
    `[${c.cid}] ${c.meta?.title || c.meta?.file || "Untitled"} (${c.meta?.year || ""})\n${c.text}`
  ).join("\n\n");
}

function citationsFromCtx(ctx) {
  const seen = new Set(), out = [];
  for (const c of ctx) {
    const key = `${c.meta?.title||""}|${c.meta?.doi||""}`;
    if (seen.has(key)) continue; seen.add(key);
    out.push({
      title: c.meta?.title || c.meta?.file || "Untitled",
      doi:   c.meta?.doi   || "",
      year:  c.meta?.year  || "",
      pmid:  c.meta?.pmid  || "",
      file:  c.meta?.file  || ""
    });
  }
  return out;
}

function extractFirstJson(s) {
  if (!s) return null;
  let depth = 0, start = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") { depth--; if (depth === 0 && start !== -1) return s.slice(start, i+1); }
  }
  return null;
}

async function callOllama(prompt, temp) {
  const r = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      model: MODEL,
      prompt,
      options: { temperature: temp, num_ctx: 4096, mirostat: 0, format: "json" },
      stream: false
    })
  }).then(res => res.json());
  return r?.response || "";
}

export async function synthesizePlan(input) {
  const ctx = await retrieveTopK(input, 3);
  const ctxText = ctxBlock(ctx);
  const citesFallback = citationsFromCtx(ctx);

  const prompt = `
You are a cautious fitness/data agent. Use ONLY the CONTEXT.
Return STRICT JSON with keys: profile, week, meals, targets, citations.
- Each workout block MAY include "src": ["S1","S2"] indicating which sources justify it.
- Each meal MAY include "src": ["S3"].
- "citations" MUST list the studies used (title, year, doi if available).
No commentary, JSON only.

CONTEXT (numbered):
${ctxText}

PROFILE:
${JSON.stringify(input)}
`;

  // First attempt
  let resp = await callOllama(prompt, 0.1);
  let plan;
  try { plan = JSON.parse(resp); }
  catch {
    const blk = extractFirstJson(resp);
    if (blk) { try { plan = JSON.parse(blk); } catch {} }
  }

  // Retry once if needed
  if (!plan) {
    resp = await callOllama(prompt + "\n\nReturn ONLY valid JSON. No prose.", 0.0);
    try { plan = JSON.parse(resp); }
    catch {
      const blk = extractFirstJson(resp);
      if (blk) plan = JSON.parse(blk);
      else throw new Error("Model did not return valid JSON");
    }
  }

  // Ensure citations exist; merge in any missing from context
  if (!Array.isArray(plan.citations) || plan.citations.length === 0) {
    plan.citations = citesFallback;
  } else {
    const keys = new Set(plan.citations.map(c => `${c.title||""}|${c.doi||""}`));
    for (const c of citesFallback) {
      const k = `${c.title||""}|${c.doi||""}`;
      if (!keys.has(k)) plan.citations.push(c);
    }
  }

  return plan;
}
