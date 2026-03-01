//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { consola } from "consola";
import { getSetting, setSetting, deleteSetting } from "./settingsStore.js";
// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_STATE = {
    status: "idle",
    activity: {
        type: "custom",
        text: "i wish you were here",
    },
};
// ─── Dysnomia activity type mapping ──────────────────────────────────────────
const ACTIVITY_TYPE_MAP = {
    playing: Constants.ActivityTypes.GAME,
    watching: Constants.ActivityTypes.WATCHING,
    listening: Constants.ActivityTypes.LISTENING,
    competing: Constants.ActivityTypes.COMPETING,
    streaming: Constants.ActivityTypes.STREAMING,
    custom: Constants.ActivityTypes.CUSTOM,
};
// ─── Module state ─────────────────────────────────────────────────────────────
let current = { ...DEFAULT_STATE, activity: { ...DEFAULT_STATE.activity } };
let activeClient = null;
let presenceInterval = null;
// ─── Internal apply ───────────────────────────────────────────────────────────
function buildActivity() {
    if (!current.activity)
        return null;
    const { type, text, url } = current.activity;
    const dysnomiaType = ACTIVITY_TYPE_MAP[type];
    if (type === "custom") {
        return { name: "Custom Status", type: dysnomiaType, state: text };
    }
    const act = { name: text, type: dysnomiaType };
    if (type === "streaming" && url)
        act.url = url;
    return act;
}
function applyPresence() {
    if (!activeClient)
        return;
    try {
        const activity = buildActivity();
        const activities = activity ? [activity] : [];
        if (activeClient.shards.size > 0) {
            for (const shard of activeClient.shards.values()) {
                shard.editStatus(current.status, activities);
            }
        }
        else {
            activeClient.editStatus(current.status, activities);
        }
    }
    catch (err) {
        consola.warn("[presence] Failed to apply presence:", err);
    }
}
// ─── Persistence ──────────────────────────────────────────────────────────────
const SETTINGS_KEY = "presence";
async function load() {
    const saved = await getSetting(SETTINGS_KEY);
    if (saved) {
        current = saved;
        consola.info("[presence] Restored saved presence state.");
    }
    else {
        consola.info("[presence] No saved state — using defaults.");
    }
}
async function save() {
    await setSetting(SETTINGS_KEY, current);
}
// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Call once when the bot is ready (and again on reconnect).
 * Safe to call multiple times — clears the previous interval first.
 */
export async function setupPresence(client) {
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
export function teardownPresence() {
    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
    }
    activeClient = null;
}
/** Set the online status (online / idle / dnd / invisible). */
export async function setOnlineStatus(status) {
    current.status = status;
    applyPresence();
    await save();
}
/** Set an activity (playing, watching, listening, competing, streaming). */
export async function setActivity(config) {
    current.activity = config;
    applyPresence();
    await save();
}
/** Set the freeform custom status text (replaces any existing activity). */
export async function setCustomStatus(text) {
    current.activity = { type: "custom", text };
    applyPresence();
    await save();
}
/** Clear the activity entirely (keeps online status). */
export async function clearActivity() {
    current.activity = null;
    applyPresence();
    await save();
}
/** Reset everything to the hardcoded default and wipe saved state. */
export async function resetPresence() {
    current = { ...DEFAULT_STATE, activity: { ...DEFAULT_STATE.activity } };
    await deleteSetting(SETTINGS_KEY);
    applyPresence();
}
/** Read-only snapshot of the current presence state. */
export function getPresenceState() {
    return current;
}
