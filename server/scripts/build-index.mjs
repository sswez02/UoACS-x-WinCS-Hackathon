// Build embeddings index -> studies/vectors.json
import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";

const CORPUS = path.join(process.cwd(), "studies", "corpus.jsonl");
const OUT = path.join(process.cwd(), "studies", "vectors.json");

if (!fs.existsSync(CORPUS)) {
  console.error("Missing corpus:", CORPUS, "Run scripts/ingest-pdfs.mjs first.");
  process.exit(1);
}

const lines = fs.readFileSync(CORPUS, "utf8").trim().split("\n").map(JSON.parse);
const embedder = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");

function meanPool(arr) {
  const d = arr[0].length, out = new Array(d).fill(0);
  for (const row of arr) for (let i = 0; i < d; i++) out[i] += row[i];
  for (let i = 0; i < d; i++) out[i] /= arr.length;
  return out;
}

const vectors = [];
for (let i = 0; i < lines.length; i++) {
  const emb = await embedder(lines[i].text, { pooling: "mean", normalize: true });
  const vec = emb.data ? Array.from(emb.data) : meanPool(emb[0]);
  vectors.push({ idx: i, vec });
  if (i % 50 === 0) console.log("embedded", i, "/", lines.length);
}

fs.writeFileSync(OUT, JSON.stringify({ vectors }, null, 0));
console.log("Wrote:", OUT);
