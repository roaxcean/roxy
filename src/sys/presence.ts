//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { Constants, Client } from "@projectdysnomia/dysnomia";
import { consola } from "consola";
import { getSetting, setSetting, deleteSetting } from "./settingsStore.js";

export type OnlineStatus = "online" | "idle" | "dnd" | "invisible";

export type ActivityType = "playing" | "watching" | "listening" | "competing" | "streaming" | "custom";

export interface ActivityConfig {
    type: ActivityType;
    text: string;
    /** Only valid when type === "streaming" */
    url?: string;
}

export interface PresenceState {
    status: OnlineStatus;
    activity: ActivityConfig | null;
}

const DEFAULT_STATE: PresenceState = {
    status: "idle",
    activity: {
        type: "custom",
        text: "test me out at gg/rsxgroup",
    },
};

const ACTIVITY_TYPE_MAP: Record<ActivityType, number> = {
    playing:   Constants.ActivityTypes.GAME,
    watching:  Constants.ActivityTypes.WATCHING,
    listening: Constants.ActivityTypes.LISTENING,
    competing: Constants.ActivityTypes.COMPETING,
    streaming: Constants.ActivityTypes.STREAMING,
    custom:    Constants.ActivityTypes.CUSTOM,
};

let current: PresenceState = { ...DEFAULT_STATE, activity: { ...DEFAULT_STATE.activity! } };
let activeClient: Client | null = null;
let presenceInterval: ReturnType<typeof setInterval> | null = null;

function buildActivity(): object | null {
    if (!current.activity) return null;

    const { type, text, url } = current.activity;
    const dysnomiaType = ACTIVITY_TYPE_MAP[type];

    if (type === "custom") {
        return { name: "Custom Status", type: dysnomiaType, state: text };
    }

    const act: Record<string, unknown> = { name: text, type: dysnomiaType };
    if (type === "streaming" && url) act.url = url;
    return act;
}

function applyPresence(): void {
    if (!activeClient) return;
    try {
        const activity = buildActivity();
        const activities = activity ? [activity] : [];

        if (activeClient.shards.size > 0) {
            for (const shard of activeClient.shards.values()) {
                shard.editStatus(current.status, activities as any);
            }
        } else {
            activeClient.editStatus(current.status, activities as any);
        }
    } catch (err) {
        consola.warn("[presence] Failed to apply presence:", err);
    }
}

const SETTINGS_KEY = "presence";

async function load(): Promise<void> {
    const saved = await getSetting<PresenceState>(SETTINGS_KEY);
    if (saved) {
        current = saved;
        consola.info("[presence] Restored saved presence state.");
    } else {
        consola.info("[presence] No saved state — using defaults.");
    }
}

async function save(): Promise<void> {
    await setSetting(SETTINGS_KEY, current);
}

/**
 * Call once when the bot is ready (and again on reconnect).
 * Safe to call multiple times — clears the previous interval first.
 */
export async function setupPresence(client: Client): Promise<void> {
    activeClient = client;

    await load();

    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
    }

    setImmediate(applyPresence);
    presenceInterval = setInterval(applyPresence, 30_000);
}

/** Tear down the refresh interval (e.g. on SIGINT). */
export function teardownPresence(): void {
    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
    }
    activeClient = null;
}

/** Set the online status (online / idle / dnd / invisible). */
export async function setOnlineStatus(status: OnlineStatus): Promise<void> {
    current.status = status;
    applyPresence();
    await save();
}

/** Set an activity (playing, watching, listening, competing, streaming). */
export async function setActivity(config: ActivityConfig): Promise<void> {
    current.activity = config;
    applyPresence();
    await save();
}

/** Set the freeform custom status text (replaces any existing activity). */
export async function setCustomStatus(text: string): Promise<void> {
    current.activity = { type: "custom", text };
    applyPresence();
    await save();
}

/** Clear the activity entirely (keeps online status). */
export async function clearActivity(): Promise<void> {
    current.activity = null;
    applyPresence();
    await save();
}

/** Reset everything to the hardcoded default and wipe saved state. */
export async function resetPresence(): Promise<void> {
    current = { ...DEFAULT_STATE, activity: { ...DEFAULT_STATE.activity! } };
    await deleteSetting(SETTINGS_KEY);
    applyPresence();
}

/** Read-only snapshot of the current presence state. */
export function getPresenceState(): Readonly<PresenceState> {
    return current;
}