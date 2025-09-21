import { retrieveTopK } from "../rag/retrieve.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.env.LOCAL_MODEL || "llama3.1:8b-instruct-q4_K_M";

export async function synthesizePlan(input) {
  const ctx = await retrieveTopK(input, 6);
  const ctxText = ctx.map((c,i)=>`[${i+1}] ${c.meta?.title||"Untitled"}\n${c.text}`).join("\n\n");

  const prompt = `
You are a cautious fitness/data agent. Use only the CONTEXT.
Return strictly valid JSON with keys: profile, week, meals, targets, citations.

CONTEXT:
${ctxText}

PROFILE:
${JSON.stringify(input)}

Return ONLY JSON.`;

  const r = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      model: MODEL,
      prompt,
      options: { temperature: 0.2, num_ctx: 8192, mirostat: 0, format: "json" },
      stream: false
    })
  }).then(res => res.json());

  // one retry if JSON invalid
  try { return JSON.parse(r.response); }
  catch {
    const r2 = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt + "\n\nReturn ONLY valid JSON. No commentary.",
        options: { temperature: 0.1, num_ctx: 8192, mirostat: 0, format: "json" },
        stream: false
      })
    }).then(res => res.json());
    return JSON.parse(r2.response);
  }
}
