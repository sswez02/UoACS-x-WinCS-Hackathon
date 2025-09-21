import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { router as generateRouter } from "./routes/generate.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// health & sample
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/hello", (_req, res) => res.json({ message: "Hello from backend!" }));

// static for generated files
app.use("/files", express.static(path.join(__dirname, "../public")));

// MOUNT your generator API
app.use("/api", generateRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
