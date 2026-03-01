//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { consola } from "consola";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE = path.join(__dirname, "..", "..", "data", "settings.json");
let cache = null;
async function read() {
    if (cache)
        return cache;
    try {
        const raw = await fs.readFile(STORE_FILE, "utf-8");
        cache = JSON.parse(raw);
    }
    catch (err) {
        if (err.code !== "ENOENT") {
            consola.warn("[settingsStore] Could not read store:", err);
        }
        cache = {};
    }
    return cache;
}
async function write(store) {
    try {
        await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
        await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
    }
    catch (err) {
        consola.error("[settingsStore] Failed to write store:", err);
    }
}
export async function getSetting(key) {
    const store = await read();
    return (key in store ? store[key] : null);
}
export async function setSetting(key, value) {
    const store = await read();
    store[key] = value;
    await write(store);
}
export async function deleteSetting(key) {
    const store = await read();
    delete store[key];
    await write(store);
}
