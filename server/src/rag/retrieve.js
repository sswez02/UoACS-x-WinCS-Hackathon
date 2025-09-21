import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";

const CORPUS = path.join(process.cwd(), "studies", "corpus.jsonl");
const VECTORS = path.join(process.cwd(), "studies", "vectors.json");

let LINES = null, VEC = null, EMBED = null;
function dot(a,b){ let s=0; for (let i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }

export async function retrieveTopK(input, k = 6) {
  if (!LINES) {
    const rawLines = fs.readFileSync(CORPUS, "utf8").split(/\r?\n/);
    LINES = rawLines.map(s=>s.trim()).filter(Boolean).map(l=>JSON.parse(l));
  }
  if (!VEC)   VEC   = JSON.parse(fs.readFileSync(VECTORS, "utf8")).vectors;
  if (!EMBED) EMBED = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");

  const q = [input.goal, input.experience, input.sex, input.age, input.injuries, input.diet]
    .filter(Boolean).join(" ; ") || "strength training and nutrition evidence";
  const qe = await EMBED(q, { pooling:"mean", normalize:true });
  const qv = Array.from(qe.data ?? qe[0][0]);

  const top = VEC.map(({idx, vec}) => ({ idx, score: dot(vec, qv) }))
                 .sort((a,b)=>b.score-a.score)
                 .slice(0, k);
  return top.map(s => LINES[s.idx]);
}
