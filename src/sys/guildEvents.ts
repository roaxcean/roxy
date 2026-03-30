//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

/**
 * guildEvents — join / leave / boost announcements.
 *
 * Completely self-contained: wire it up with a single `setupGuildEvents(app)`
 * call in service.ts, right next to `setupPresence`.  Nothing else needs
 * touching.
 *
 * ── Config shape (stored under "guildEvents" in settings.json) ───────────────
 *
 * {
 *   [guildId: string]: {
 *     join?:  { channelId: string; message: string; boostRoleId?: string }
 *     leave?: { channelId: string; message: string }
 *     boost?: { channelId: string; message: string; boostRoleId?: string }
 *   }
 * }
 *
 * ── Supported placeholders ───────────────────────────────────────────────────
 *
 *   {user}      — <@userId> mention
 *   {userid}    — raw user ID
 *   {tag}       — username (no discriminator on new accounts)
 *   {server}    — guild name
 *   {count}     — current member count (after join/leave)
 *   {boosters}  — current premium subscriber count
 *   {tier}      — boost tier (0–3)
 */

import {Client, Constants, Guild, Member, OldMember} from "@projectdysnomia/dysnomia";
import { consola } from "consola";
import { getSetting } from "./settingsStore.js";

export interface EventConfig {
    channelId: string;
    message: string;
    /** Optional: role ID that marks a booster (used as boost fallback). */
    boostRoleId?: string;
}

export interface GuildEventConfig {
    join?:  EventConfig;
    leave?: EventConfig;
    boost?: EventConfig & { boostRoleId?: string };
}

export type GuildEventsStore = Record<string, GuildEventConfig>;

const SETTINGS_KEY = "guildEvents";

interface PlaceholderContext {
    userId:       string;
    username:     string;
    guildName:    string;
    memberCount:  number;
    boosterCount: number;
    boostTier:    number;
}

function resolvePlaceholders(template: string, ctx: PlaceholderContext): string {
    return template
        .replaceAll("{user}",     `<@${ctx.userId}>`)
        .replaceAll("{userid}",   ctx.userId)
        .replaceAll("{tag}",      ctx.username)
        .replaceAll("{server}",   ctx.guildName)
        .replaceAll("{count}",    String(ctx.memberCount))
        .replaceAll("{boosters}", String(ctx.boosterCount))
        .replaceAll("{tier}",     String(ctx.boostTier));
}

async function sendEventMessage(
    client: Client,
    channelId: string,
    content: string,
): Promise<void> {
    try {
        let components: any[];
        try {
            const parsed = JSON.parse(content);
            if (!Array.isArray(parsed)) {
                consola.error(`[guildEvents] JSON must be a top-level array of component objects.`);
            }
            components = parsed;
        } catch (err) {
            const msg = err instanceof SyntaxError ? err.message : String(err);
            consola.error(`[guildEvents] JSON parse failed: ${msg}`);
            return;
        }

        await client.createMessage(channelId, {
            components: components,
            flags: Constants.MessageFlags.IS_COMPONENTS_V2,
        });
    } catch (err) {
        consola.warn(`[guildEvents] Failed to send to channel ${channelId}:`, err);
    }
}

async function loadConfig(): Promise<GuildEventsStore> {
    return (await getSetting<GuildEventsStore>(SETTINGS_KEY)) ?? {};
}

async function onMemberAdd(client: Client, member: Member): Promise<void> {
    const guildId = member.guild?.id;
    if (!guildId) return;

    const store = await loadConfig();
    const cfg   = store[guildId]?.join;
    if (!cfg) return;

    const guild = client.guilds.get(guildId);

    const ctx: PlaceholderContext = {
        userId:       member.id ?? member.user?.id,
        username:     member.user?.username ?? member.username ?? "unknown",
        guildName:    guild?.name ?? "this server",
        memberCount:  guild?.memberCount ?? 0,
        boosterCount: guild?.premiumSubscriptionCount ?? 0,
        boostTier:    guild?.premiumTier ?? 0,
    };
    console.log("[guildEvents][onMemberAdd] ctx:", ctx);

    const content = resolvePlaceholders(cfg.message, ctx);
    console.log("[guildEvents][onMemberAdd] content:", content);
    await sendEventMessage(client, cfg.channelId, content);
}

async function onMemberRemove(client: Client, member: Member, guild: Guild): Promise<void> {
    const guildId = guild?.id ?? member.guild?.id;
    if (!guildId) return;

    const store = await loadConfig();
    const cfg   = store[guildId]?.leave;
    if (!cfg) return;

    const resolvedGuild = client.guilds.get(guildId) ?? guild;

    const ctx: PlaceholderContext = {
        userId:       member.id ?? member.user?.id,
        username:     member.user?.username ?? member.username ?? "unknown",
        guildName:    resolvedGuild?.name ?? "this server",
        memberCount:  resolvedGuild?.memberCount ?? 0,
        boosterCount: resolvedGuild?.premiumSubscriptionCount ?? 0,
        boostTier:    resolvedGuild?.premiumTier ?? 0,
    };

    const content = resolvePlaceholders(cfg.message, ctx);
    await sendEventMessage(client, cfg.channelId, content);
}

async function onMemberUpdate(client: Client, member: Member, oldMember: OldMember | null): Promise<void> {
    const guildId = member.guild?.id;
    if (!guildId) return;

    const store = await loadConfig();
    const cfg   = store[guildId]?.boost;
    if (!cfg) return;

    const oldPremium = oldMember && Object.keys(oldMember).length > 0
        ? oldMember.premiumSince
        : member.premiumSince;

    const justBoostedViaPremium = !oldPremium && !!member.premiumSince;

    const justBoostedViaRole =
        cfg.boostRoleId &&
        oldMember && Object.keys(oldMember).length > 0 &&
        !(oldMember?.roles ?? []).includes(cfg.boostRoleId) &&
        (member.roles ?? []).includes(cfg.boostRoleId);

    if (!justBoostedViaPremium && !justBoostedViaRole) return;

    const guild = client.guilds.get(guildId);

    const ctx: PlaceholderContext = {
        userId:       member.id ?? member.user?.id,
        username:     member.user?.username ?? member.username ?? "unknown",
        guildName:    guild?.name ?? "this server",
        memberCount:  guild?.memberCount ?? 0,
        boosterCount: guild?.premiumSubscriptionCount ?? 0,
        boostTier:    guild?.premiumTier ?? 0,
    };

    const content = resolvePlaceholders(cfg.message, ctx);
    await sendEventMessage(client, cfg.channelId, content);
}

/**
 * Call once from service.ts after the client is ready.
 * Registers the three guild member events on the provided client instance.
 */
export function setupGuildEvents(client: Client): void {
    client.on("guildMemberAdd", (_: Guild, member: Member) => {
        onMemberAdd(client, member).catch(err =>
            consola.warn("[guildEvents] guildMemberAdd error:", err)
        );
    });

    client.on("guildMemberRemove", (guild: Guild, member: Member) => {
        onMemberRemove(client, member, guild).catch(err =>
            consola.warn("[guildEvents] guildMemberRemove error:", err)
        );
    });

    client.on("guildMemberUpdate", (_: Guild, member: Member, oldMember: OldMember | null) => {
        onMemberUpdate(client, member, oldMember).catch(err =>
            consola.warn("[guildEvents] guildMemberUpdate error:", err)
        );
    });

    consola.info("[guildEvents] Guild member event listeners registered.");
}