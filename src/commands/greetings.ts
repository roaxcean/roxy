//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

/**
 * /greetings — configure join / leave / boost announcements per guild.
 *
 * Subcommands:
 *   /greetings set-join   <channel> <message> [guild_id]
 *   /greetings set-leave  <channel> <message> [guild_id]
 *   /greetings set-boost  <channel> <message> [boost_role] [guild_id]
 *   /greetings remove-join   [guild_id]
 *   /greetings remove-leave  [guild_id]
 *   /greetings remove-boost  [guild_id]
 *   /greetings view          [guild_id]
 *
 * All subcommands are ownerOnly + hidden from /help.
 *
 * Message placeholders:
 *   {user}     — @mention
 *   {userid}   — raw user ID
 *   {tag}      — username
 *   {server}   — guild name
 *   {count}    — member count
 *   {boosters} — booster count
 *   {tier}     — boost tier (0–3)
 */

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";
import { getSetting, setSetting } from "../sys/settingsStore.js";
import { GuildEventsStore, EventConfig } from "../sys/guildEvents.js";

const SETTINGS_KEY = "guildEvents";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadStore(): Promise<GuildEventsStore> {
    return (await getSetting<GuildEventsStore>(SETTINGS_KEY)) ?? {};
}

async function saveStore(store: GuildEventsStore): Promise<void> {
    await setSetting(SETTINGS_KEY, store);
}

function resolveOpts(interaction: CommandInteraction): any[] {
    const raw = interaction.data.options as any[] | undefined;
    return raw?.[0]?.options ?? raw ?? [];
}

function opt<T>(opts: any[], name: string): T | undefined {
    return opts.find((o: any) => o.name === name)?.value as T | undefined;
}

/** Resolve the target guild ID: prefer explicit guild_id option, then current guild. */
function resolveGuildId(opts: any[], interaction: CommandInteraction): string | null {
    return opt<string>(opts, "guild_id") ?? interaction.guild?.id ?? null;
}

const PLACEHOLDER_DOCS = [
    "`{user}` — @mention",
    "`{userid}` — raw ID",
    "`{tag}` — username",
    "`{server}` — server name",
    "`{count}` — member count",
    "`{boosters}` — booster count",
    "`{tier}` — boost tier",
].join("  ·  ");

// ── Subcommand handlers ───────────────────────────────────────────────────────

async function handleView(interaction: CommandInteraction): Promise<void> {
    const opts    = resolveOpts(interaction);
    const guildId = resolveGuildId(opts, interaction);

    if (!guildId) {
        await MessageHandler.warning(interaction, "Run this in a guild or pass `guild_id`.");
        return;
    }

    const store = await loadStore();
    const cfg   = store[guildId];

    const fmt = (label: string, event?: EventConfig): string => {
        if (!event) return `### ${label}\n> *not configured*`;
        const lines = [
            `### ${label}`,
            `> **Channel:** <#${event.channelId}>`,
            `> **Message:** \`${event.message}\``,
        ];
        if ((event as any).boostRoleId) {
            lines.push(`> **Boost role fallback:** <@&${(event as any).boostRoleId}>`);
        }
        return lines.join("\n");
    };

    await MessageHandler.raw(interaction, {
        components: [{
            type: Constants.ComponentTypes.CONTAINER,
            components: [
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `## <:settings:1426875133385244703> Greetings config for \`${guildId}\``,
                },
                { type: Constants.ComponentTypes.SEPARATOR },
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: [
                        fmt("<:arrowr:1426686528276529313> Join",    cfg?.join),
                        fmt("<:cross:1467501434210877593> Leave",    cfg?.leave),
                        fmt("<:sparkles:1477364207593852999> Boost", cfg?.boost),
                    ].join("\n\n"),
                },
                { type: Constants.ComponentTypes.SEPARATOR },
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `-# **Placeholders:** ${PLACEHOLDER_DOCS}`,
                },
            ],
        }],
    });
}

async function handleSet(
    interaction: CommandInteraction,
    eventType: "join" | "leave" | "boost",
): Promise<void> {
    const opts      = resolveOpts(interaction);
    const guildId   = resolveGuildId(opts, interaction);
    const channelId = opt<string>(opts, "channel");
    const message   = opt<string>(opts, "message");

    if (!guildId) {
        await MessageHandler.warning(interaction, "Run this in a guild or pass `guild_id`.");
        return;
    }
    if (!channelId || !message) {
        await MessageHandler.warning(interaction, "Both `channel` and `message` are required.");
        return;
    }

    try {
        const parsed = JSON.parse(message);
        if (!Array.isArray(parsed)) {
            await MessageHandler.error(
                interaction,
                "JSON must be a top-level array of component objects.",
                undefined,
                true
            );
            return;
        }
    } catch (err) {
        const msg = err instanceof SyntaxError ? err.message : String(err);
        await MessageHandler.error(
            interaction,
            `JSON parse failed: ${msg}`,
            "Check your JSON syntax and try again.",
            true
        );
        return;
    }

    const entry: EventConfig = { channelId, message };

    if (eventType === "boost") {
        const boostRoleId = opt<string>(opts, "boost_role");
        if (boostRoleId) (entry as any).boostRoleId = boostRoleId;
    }

    const store = await loadStore();
    if (!store[guildId]) store[guildId] = {};
    store[guildId][eventType] = entry;
    await saveStore(store);

    const labels = {
        join:  "<:arrowr:1426686528276529313> join",
        leave: "<:cross:1467501434210877593> leave",
        boost: "<:sparkles:1477364207593852999> boost",
    };

    await MessageHandler.success(
        interaction,
        `${labels[eventType]} announcements set for <#${channelId}>.\n-# Message: \`${message}\``
    );
}

async function handleRemove(
    interaction: CommandInteraction,
    eventType: "join" | "leave" | "boost",
): Promise<void> {
    const opts    = resolveOpts(interaction);
    const guildId = resolveGuildId(opts, interaction);

    if (!guildId) {
        await MessageHandler.warning(interaction, "Run this in a guild or pass `guild_id`.");
        return;
    }

    const store = await loadStore();
    if (!store[guildId]?.[eventType]) {
        await MessageHandler.info(interaction, "Nothing to remove", `No ${eventType} config found for \`${guildId}\`.`);
        return;
    }

    delete store[guildId][eventType];

    // clean up the guild key entirely if all three events are gone
    const remaining = store[guildId];
    if (!remaining.join && !remaining.leave && !remaining.boost) {
        delete store[guildId];
    }

    await saveStore(store);
    await MessageHandler.success(interaction, `${eventType} announcement removed for \`${guildId}\`.`);
}

// ── Command definition ────────────────────────────────────────────────────────

const GUILD_ID_OPTION = {
    name: "guild_id",
    description: "Target guild ID (defaults to current guild)",
    type: Constants.ApplicationCommandOptionTypes.STRING,
    required: false,
};

const CHANNEL_OPTION = {
    name: "channel",
    description: "Channel to send the announcement in",
    type: Constants.ApplicationCommandOptionTypes.CHANNEL,
    required: true,
};

const MESSAGE_OPTION = {
    name: "message",
    description: "Components V2 JSON — use {user} {tag} {server} {count} {boosters} {tier} {userid}",
    type: Constants.ApplicationCommandOptionTypes.STRING,
    required: true,
};

// eslint-disable-next-line no-unused-vars
const handlers: Record<string, (i: CommandInteraction) => Promise<void>> = {
    "view":         (i) => handleView(i),
    "set-join":     (i) => handleSet(i, "join"),
    "set-leave":    (i) => handleSet(i, "leave"),
    "set-boost":    (i) => handleSet(i, "boost"),
    "remove-join":  (i) => handleRemove(i, "join"),
    "remove-leave": (i) => handleRemove(i, "leave"),
    "remove-boost": (i) => handleRemove(i, "boost"),
};

export default {
    name: "greetings",
    description: "Configure join / leave / boost announcements",
    ownerOnly: true,
    hidden: true,
    visibility: "ephemeral" as const,
    category: "<:info:1467501339729727662> General",

    options: [
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "view",
            description: "Show current greeting config for a guild",
            options: [GUILD_ID_OPTION],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "set-join",
            description: "Set the join announcement channel and message",
            options: [CHANNEL_OPTION, MESSAGE_OPTION, GUILD_ID_OPTION],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "set-leave",
            description: "Set the leave announcement channel and message",
            options: [CHANNEL_OPTION, MESSAGE_OPTION, GUILD_ID_OPTION],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "set-boost",
            description: "Set the boost announcement channel and message",
            options: [
                CHANNEL_OPTION,
                MESSAGE_OPTION,
                {
                    name: "boost_role",
                    description: "Boost role ID to use as fallback detection (optional)",
                    type: Constants.ApplicationCommandOptionTypes.ROLE,
                    required: false,
                },
                GUILD_ID_OPTION,
            ],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "remove-join",
            description: "Remove the join announcement",
            options: [GUILD_ID_OPTION],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "remove-leave",
            description: "Remove the leave announcement",
            options: [GUILD_ID_OPTION],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "remove-boost",
            description: "Remove the boost announcement",
            options: [GUILD_ID_OPTION],
        },
    ],

    async function(interaction: CommandInteraction) {
        const raw     = interaction.data.options as any[] | undefined;
        const subName = raw?.[0]?.name as string | undefined;

        if (!subName || !handlers[subName]) {
            await MessageHandler.warning(interaction, "Unknown subcommand.");
            return;
        }

        await handlers[subName](interaction);
    },
};