//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

/**
 * Lightweight in-memory TTL cache for paginated Roblox command data.
 *
 * Keyed by a string (e.g. `friends:12345678`) and holds whatever payload
 * the original slash-command fetch produced.  Entries expire after TTL_MS
 * and are lazily evicted on the next access or periodic sweep.
 *
 * Usage:
 *   import { robloxCache } from "../../sys/robloxCache.js";
 *
 *   // store (call once when the slash command first runs)
 *   robloxCache.set("friends:12345678", { user, resolved, friendIds });
 *
 *   // retrieve in the component handler
 *   const cached = robloxCache.get<FriendsCacheEntry>("friends:12345678");
 *   if (!cached) { ... tell user to re-run the command ... }
 */

const TTL_MS   = 5 * 60 * 1_000; // 5 minutes - plenty for a pagination session
const SWEEP_MS = 2 * 60 * 1_000; // sweep for stale entries every 2 minutes

interface Entry<T> {
    value: T;
    expiresAt: number;
}

class RobloxCache {
    private store = new Map<string, Entry<unknown>>();

    constructor() {
        // periodic sweep so the map doesn't silently accumulate stale entries
        // in long-running processes.  unref() so the timer never keeps node alive.
        const timer = setInterval(() => this.sweep(), SWEEP_MS);
        if (typeof timer.unref === "function") timer.unref();
    }

    set<T>(key: string, value: T, ttl = TTL_MS): void {
        this.store.set(key, { value, expiresAt: Date.now() + ttl });
    }

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value as T;
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    private sweep(): void {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (now > entry.expiresAt) this.store.delete(key);
        }
    }
}

/** Singleton - import this everywhere, never instantiate a second one. */
export const robloxCache = new RobloxCache();

export interface FriendsCacheEntry {
    user:       { id: number; name: string };
    resolved:   any[];   // sorted resolved user objects
    friendIds:  number[];
}

export interface GroupsCacheEntry {
    user:        { id: number; name: string };
    memberships: any[];
}

export interface GroupGamesCacheEntry {
    group:    any;
    games:    any[];
    statsMap: Map<number, { visits: number; placeId: number | null }>;
}
