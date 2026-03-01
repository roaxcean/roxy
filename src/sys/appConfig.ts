//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

/**
 * appConfig - replaces APP_OWNER_ID, APP_LOGCHANNEL, APP_PINGUSER, APP_PINGROLE.
 *
 * All config lives in data/settings.json under the key "appConfig".
 * Use the exported helpers to query; use setSetting("appConfig", …) to mutate.
 *
 * ── Shape ────────────────────────────────────────────────────────────────────
 *
 * {
 *   staff: {
 *     userIds:  string[]   // user IDs with owner-level access (global)
 *     roleIds:  string[]   // role IDs that grant owner-level access (any server)
 *   },
 *
 *   logChannels: [         // ordered list - Roxy tries each in turn
 *     { guildId: string, channelId: string },
 *     ...
 *   ],
 *
 *   pingTargets: [         // per-guild (or global) ping config for error alerts
 *     {
 *       guildId?: string,  // omit → used when no guild context (DM errors, process crashes)
 *       userIds:  string[],
 *       roleIds:  string[],
 *     },
 *     ...
 *   ],
 * }
 */

import { getSetting } from "./settingsStore.js";

export interface StaffConfig {
    /** Discord user IDs with global owner-level access. */
    userIds: string[];
    /** Role IDs that grant owner-level access in any server. */
    roleIds: string[];
}

export interface LogChannel {
    guildId: string;
    channelId: string;
}

export interface PingTarget {
    /**
     * When set, this entry is used for errors that occurred in this guild.
     * When absent, this entry is the global/fallback target (used for process-level
     * crashes and DM-context errors).
     */
    guildId?: string;
    userIds: string[];
    roleIds: string[];
}

export interface AppConfig {
    staff: StaffConfig;
    logChannels: LogChannel[];
    pingTargets: PingTarget[];
}

const DEFAULT_CONFIG: AppConfig = {
    staff:       { userIds: [], roleIds: [] },
    logChannels: [],
    pingTargets: [],
};

const SETTINGS_KEY = "appConfig";

/**
 * Load the current AppConfig from the settings store.
 * Merges deeply with defaults so missing keys never cause crashes.
 */
export async function getAppConfig(): Promise<AppConfig> {
    const stored = await getSetting<Partial<AppConfig>>(SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_CONFIG };

    return {
        staff: {
            userIds: stored.staff?.userIds ?? [],
            roleIds: stored.staff?.roleIds ?? [],
        },
        logChannels: stored.logChannels ?? [],
        pingTargets: stored.pingTargets ?? [],
    };
}

/**
 * Returns true if the given userId is a staff member, or if they hold any
 * staff role in the guild they're invoking from.
 *
 * @param userId   - The user to check.
 * @param roleIds  - The role IDs the user currently has (from interaction.member.roles).
 */
export async function isStaff(userId: string, roleIds: string[] = []): Promise<boolean> {
    const cfg = await getAppConfig();
    if (cfg.staff.userIds.includes(userId)) return true;
    if (cfg.staff.roleIds.some(r => roleIds.includes(r))) return true;
    return false;
}

/** Returns all configured log channels. */
export async function getLogChannels(): Promise<LogChannel[]> {
    const cfg = await getAppConfig();
    return cfg.logChannels;
}

/**
 * Build a Discord mention string for a given guild context.
 *
 * Lookup order:
 *   1. Entry whose guildId matches the provided guildId.
 *   2. Global entry (no guildId) as fallback.
 *   3. Empty string if nothing is configured.
 */
export async function buildPingLine(guildId?: string): Promise<string> {
    const cfg = await getAppConfig();

    // try guild-specific first, then global fallback
    const target =
        (guildId ? cfg.pingTargets.find(p => p.guildId === guildId) : undefined) ??
        cfg.pingTargets.find(p => !p.guildId);

    if (!target) return "> No pings configured.";

    const parts: string[] = [
        ...target.roleIds.map(id => `<@&${id}>`),
        ...target.userIds.map(id => `<@${id}>`),
    ];

    return parts.length > 0 ? `> ${parts.join(" ")}` : "> No pings configured.";
}