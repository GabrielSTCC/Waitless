import { readFileSync } from "node:fs";
import { cert } from "firebase-admin/app";

const raw = readFileSync("secrets/firebase-service-account.json", "utf8");
const parsed = JSON.parse(raw);
const minified = JSON.stringify(parsed);

try {
  cert(JSON.parse(minified));
  console.log("OK: minified JSON works with firebase-admin cert");
  console.log("project_id:", parsed.project_id);
  console.log("minified length:", minified.length);
} catch (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}
