//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORE_FILE = path.join(__dirname, "..", "..", "data", "presence.json");

export async function loadPresence(): Promise<any | null> {
    try {
        const raw = await fs.readFile(STORE_FILE, "utf-8");
        return JSON.parse(raw);
    } catch {
        return null; // file missing or corrupt
    }
}

export async function savePresence(state: any) {
    try {
        await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
        await fs.writeFile(STORE_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (err) {
        console.error("Failed to save presence state:", err);
    }
}
