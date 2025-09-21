import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";

const CORPUS  = path.join(process.cwd(), "studies", "corpus.jsonl");
const VECTORS = path.join(process.cwd(), "studies", "vectors.json");

let LINES = null, VEC = null, EMBED = null;

// Faster dot with Float32Array
function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function inferMetaFromText(text = "", meta = {}) {
  const front = text.slice(0, 4000);

  const doi  = meta.doi  || (front.match(/\b(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\b/i)?.[1] ?? "");
  const year = meta.year || (front.match(/\b(20\d{2}|19\d{2})\b/)?.[1] ?? "");

  // crude title extraction: look for a sentence before "Journal" or after DOI
  let title = meta.title || "";
  if (!title || title.startsWith("2. The Journal")) {
    const m = front.match(/(?:\.\s|DOI:.*?\s)([A-Z][^.!?\n]{10,200})/);
    if (m) title = m[1].trim();
  }

  return { ...meta, doi, year, title };
}

// Load once and keep in memory as typed arrays
function loadCorpus() {
  if (LINES && VEC) return;
  const raw = fs.readFileSync(CORPUS, "utf8")
    .split(/\r?\n/).filter(Boolean);
  LINES = raw.map((l, idx) => ({ ...JSON.parse(l), idx }));

  const vecRaw = JSON.parse(fs.readFileSync(VECTORS, "utf8")).vectors;
  VEC = vecRaw.map(({ idx, vec }) => ({
    idx,
    vec: Float32Array.from(vec) // typed array for speed
  }));
}

// Top-K selection without full sort
function topK(scores, k) {
  const result = [];
  for (const s of scores) {
    if (result.length < k) {
      result.push(s);
      result.sort((a,b) => a.score - b.score); // keep smallest first
    } else if (s.score > result[0].score) {
      result[0] = s;
      result.sort((a,b) => a.score - b.score);
    }
  }
  return result.reverse(); // highest → lowest
}

export async function retrieveTopK(input, k = 6) {
  loadCorpus();
  if (!EMBED) EMBED = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");

  const q = [
    input.goal, input.experience, input.sex, input.age,
    input.days_per_week, input.injuries, input.diet
  ].filter(Boolean).join(" ; ") || "strength training and nutrition evidence";

  const qe = await EMBED(q, { pooling:"mean", normalize:true });
  const qv = Float32Array.from(qe.data ?? qe[0][0]);

  const scores = VEC.map(({ idx, vec }) => ({ idx, score: dot(vec, qv) }));
  const top = topK(scores, k);

  return top.map((s, i) => {
    const { text, meta = {} } = LINES[s.idx];
    const normMeta = inferMetaFromText(text, meta);
    return {
      cid: `S${i+1}`,
      text,
      score: s.score,
      meta: {
        title: normMeta.title ?? normMeta.file ?? "Untitled",
        file:  normMeta.file  ?? "",
        doi:   normMeta.doi   ?? "",
        year:  normMeta.year  ?? "",
        pmid:  normMeta.pmid  ?? ""
      }
    };
  });
}
