//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants, Client } from "@projectdysnomia/dysnomia";
import { loadPresence, savePresence } from "./presenceStore.js";

export type PresenceMode = "auto" | "custom";

interface PresenceState {
    mode: PresenceMode;
    status: "online" | "idle" | "dnd" | "invisible";
    activity: any | null;
}

const state: PresenceState = {
    mode: "auto",
    status: "idle",
    activity: {
        name: "Roxy",
        state: "i wish you were here",
        type: Constants.ActivityTypes.CUSTOM,
    },
};

let interval: NodeJS.Timeout | null = null;

export async function setupPresence(client: Client) {
    const persisted = await loadPresence();
    if (persisted) Object.assign(state, persisted);

    if (interval) clearInterval(interval);

    const apply = () => client.editStatus(state.status, state.activity);
    apply();
    interval = setInterval(apply, 30_000);
}

export async function setCustomStatus(text: string) {
    state.mode = "custom";
    state.activity = {
        name: "Custom Status",
        type: Constants.ActivityTypes.CUSTOM,
        state: text,
    };
    await savePresence(state);
}

export async function clearCustomStatus() {
    state.mode = "auto";
    state.activity = {
        name: "Roxy",
        state: "i wish you were here",
        type: Constants.ActivityTypes.CUSTOM,
    };
    await savePresence(state);
}