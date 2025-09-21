// PDFs -> studies/corpus.jsonl using pdfjs-dist (sync fd writes + verbose)
import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"; // v4 path

const PDFs_DIR = path.join(process.cwd(), "studies", "pdfs");
const OUT = path.join(process.cwd(), "studies", "corpus.jsonl");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

// open fd (truncate fresh)
const fd = fs.openSync(OUT, "w");

function chunk(text, chunkSize = 1000, overlap = 150) {
  const out = [];
  for (let i = 0; i < text.length;) {
    const end = Math.min(text.length, i + chunkSize);
    const piece = text.slice(i, end).replace(/\s+/g, " ").trim();
    if (piece.length > 200) out.push(piece);
    i = Math.max(0, end - overlap);
  }
  return out;
}

console.log("[pdfjs] cwd:", process.cwd());
console.log("[pdfjs] PDFs_DIR:", PDFs_DIR);
console.log("[pdfjs] OUT:", OUT);

if (!fs.existsSync(PDFs_DIR)) {
  console.error("[pdfjs] No studies/pdfs found:", PDFs_DIR);
  process.exit(1);
}
const files = fs.readdirSync(PDFs_DIR).filter(f => f.toLowerCase().endsWith(".pdf"));
console.log("[pdfjs] files:", files);
if (!files.length) { console.error("[pdfjs] No PDFs"); process.exit(1); }

let total = 0;
for (const f of files) {
  const full = path.join(PDFs_DIR, f);
  console.log("[pdfjs] reading:", full);
  try {
    const data = new Uint8Array(fs.readFileSync(full));
    const doc = await pdfjsLib.getDocument({ data }).promise;

    let text = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map(i => i.str).join(" ") + "\n";
    }
    console.log("[pdfjs] total text length:", text.length);

    const pieces = chunk(text);
    console.log("[pdfjs] chunks:", pieces.length);

    const base = path.parse(f).name;
    for (const p of pieces) {
      const rec = JSON.stringify({ text: p, meta: { title: base, file: f } }) + "\n";
      fs.writeSync(fd, rec, null, "utf8");
      total++;
    }
    console.log(`[pdfjs] Ingested: ${f} (${pieces.length} chunks)`);
  } catch (e) {
    console.error("[pdfjs] FAILED:", f, e?.message || e);
  }
}

fs.fsyncSync(fd);
fs.closeSync(fd);
console.log(`[pdfjs] Wrote ${total} line(s) to`, OUT);
