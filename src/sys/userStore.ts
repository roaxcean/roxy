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
const __dirname  = path.dirname(__filename);

const STORE_FILE = path.join(__dirname, "..", "..", "data", "users.json");

type UserStore = Record<string, Record<string, unknown>>;

let cache: UserStore | null = null;

async function read(): Promise<UserStore> {
    if (cache) return cache;
    try {
        const raw = await fs.readFile(STORE_FILE, "utf-8");
        cache = JSON.parse(raw) as UserStore;
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            consola.warn("[userStore] Could not read store:", err);
        }
        cache = {};
    }
    return cache;
}

async function write(store: UserStore): Promise<void> {
    try {
        await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
        await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
    } catch (err) {
        consola.error("[userStore] Failed to write store:", err);
    }
}

export async function getUserValue<T>(userId: string, key: string): Promise<T | null> {
    const store = await read();
    return (store[userId]?.[key] as T) ?? null;
}

export async function setUserValue<T>(userId: string, key: string, value: T): Promise<void> {
    const store = await read();
    if (!store[userId]) store[userId] = {};
    store[userId][key] = value as unknown;
    await write(store);
}