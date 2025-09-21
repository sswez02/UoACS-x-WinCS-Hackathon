// PDFs -> studies/corpus.jsonl (pdfjs-dist, per-file writes, progress logs)
import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// CONFIG
const PDFs_DIR = path.join(process.cwd(), "studies", "pdfs");
const OUT = path.join(process.cwd(), "studies", "corpus.jsonl");
const CHUNK_SIZE = 1000;
const OVERLAP = 150;
const PER_FILE_TIMEOUT_MS = Number(process.env.PER_FILE_TIMEOUT_MS || 45_000);
const PER_PAGE_TIMEOUT_MS = Number(process.env.PER_PAGE_TIMEOUT_MS || 5_000);

process.on("uncaughtException", (e) => {
  console.error("[ingest] UNCAUGHT:", e?.stack || e);
  process.exitCode = 1;
});
process.on("unhandledRejection", (e) => {
  console.error("[ingest] UNHANDLED REJECTION:", e);
  process.exitCode = 1;
});

function chunk(text, chunkSize = CHUNK_SIZE, overlap = OVERLAP) {
  const out = [];
  if (chunkSize <= 0) return out;

  // keep overlap sane
  overlap = Math.max(0, Math.min(overlap, chunkSize - 1));

  for (let i = 0; i < text.length;) {
    const end = Math.min(text.length, i + chunkSize);
    const piece = text.slice(i, end).replace(/\s+/g, " ").trim();
    if (piece.length > 200) out.push(piece);

    // if we reached the end, we're done
    if (end === text.length) break;

    const next = end - overlap;
    // ensure forward progress
    i = next > i ? next : end;
  }
  return out;
}
function appendLines(lines) {
  if (!lines.length) return;
  fs.appendFileSync(OUT, lines.join("\n") + "\n", "utf8");
}

// Hard timeout helper
function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_res, rej) => {
    t = setTimeout(() => rej(new Error(`${label || "TIMEOUT"} after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

// Small yield so the event loop can process timers/timeouts
function tick() {
  return new Promise((res) => setImmediate(res));
}

console.log("[ingest] cwd:", process.cwd());
console.log("[ingest] PDFs_DIR:", PDFs_DIR);
console.log("[ingest] OUT:", OUT);
console.log("[ingest] timeouts:", { PER_FILE_TIMEOUT_MS, PER_PAGE_TIMEOUT_MS });

if (!fs.existsSync(PDFs_DIR)) {
  console.error("[ingest] ERROR: No studies/pdfs folder:", PDFs_DIR);
  process.exit(1);
}

const files = fs.readdirSync(PDFs_DIR).filter(f => f.toLowerCase().endsWith(".pdf"));
if (!files.length) {
  console.error("[ingest] ERROR: No PDFs found in", PDFs_DIR);
  process.exit(1);
}

// start fresh output file
fs.mkdirSync(path.dirname(OUT), { recursive: true });
try { fs.unlinkSync(OUT); } catch {}

let grandTotal = 0;

for (let fi = 0; fi < files.length; fi++) {
  const f = files[fi];
  const full = path.join(PDFs_DIR, f);
  console.log(`\n[ingest] (${fi+1}/${files.length}) reading: ${full}`);

  const start = Date.now();

  const perFileTask = (async () => {
    let wrote = 0;
    let doc;

    try {
      const data = new Uint8Array(fs.readFileSync(full));
      doc = await pdfjsLib.getDocument({
        data,
        isEvalSupported: false,
        useWorkerFetch: false,
        disableFontFace: true,
        worker: null,                // disable worker in Node
        disableAutoFetch: true,
        stopAtErrors: false,
      }).promise;

      let text = "";
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await withTimeout(doc.getPage(p), PER_PAGE_TIMEOUT_MS, `getPage(${p})`);
        const content = await withTimeout(page.getTextContent(), PER_PAGE_TIMEOUT_MS, `getTextContent(${p})`);
        text += content.items.map(i => i.str).join(" ") + "\n";
        if (p % 10 === 0 || p === doc.numPages) {
          console.log(`[ingest]   page ${p}/${doc.numPages} (acc len=${text.length})`);
        }
        if (p % 5 === 0) await tick(); // keep timeouts responsive
      }

      console.log("[ingest]   finished page loop, starting chunk()");

      const pieces = chunk(text);
      console.log(`[ingest]   total text length: ${text.length}`);
      console.log(`[ingest]   chunks: ${pieces.length}`);

      const base = path.parse(f).name;
      const lines = pieces.map(p =>
        JSON.stringify({ text: p, meta: { title: base, file: f } })
      );

      console.log("[ingest]   writing JSONL lines…");
      if (lines.length) {
        await withTimeout(Promise.resolve().then(() => appendLines(lines)),
                          10_000, "appendLines");
        wrote = lines.length;
        grandTotal += wrote;
      }
      console.log(`[ingest]   wrote ${wrote} line(s) from '${f}' in ${Date.now() - start} ms`);
    } finally {
      try { await doc?.cleanup?.(); } catch (e) { console.warn("[ingest] cleanup warn:", e?.message || e); }
      try { await doc?.destroy?.(); } catch (e) { console.warn("[ingest] destroy warn:", e?.message || e); }
    }
  })();

  try {
    await withTimeout(perFileTask, PER_FILE_TIMEOUT_MS, `PER_FILE_TIMEOUT '${f}'`);
  } catch (e) {
    console.warn(`[ingest]   ${e?.message || e}`);
    const base = path.parse(f).name;
    fs.appendFileSync(
      OUT,
      JSON.stringify({ text: "", meta: { title: base, file: f, note: "timeout-or-error", err: String(e?.message || e) } }) + "\n",
      "utf8"
    );
    continue; // skip to next file
  }
}

console.log(`\n[ingest] DONE. Wrote ${grandTotal} line(s) to ${OUT}`);
