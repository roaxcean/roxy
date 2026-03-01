/* eslint-disable no-unused-vars */
//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
/**
 * /config — manage the bot's runtime configuration.
 *
 * Subcommands:
 *   /config view              — show current config
 *   /config staff-add         — add a user or role to staff
 *   /config staff-remove      — remove a user or role from staff
 *   /config log-add           — add a log channel
 *   /config log-remove        — remove a log channel
 *   /config ping-set          — set ping targets for a guild (or global)
 *   /config ping-remove       — clear ping targets for a guild (or global)
 *
 * All subcommands are ownerOnly and hidden from /help.
 */
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";
import { getSetting, setSetting } from "../sys/settingsStore.js";
const SETTINGS_KEY = "appConfig";
async function loadConfig() {
    const stored = await getSetting(SETTINGS_KEY);
    return {
        staff: { userIds: stored?.staff?.userIds ?? [], roleIds: stored?.staff?.roleIds ?? [] },
        logChannels: stored?.logChannels ?? [],
        pingTargets: stored?.pingTargets ?? [],
    };
}
async function saveConfig(cfg) {
    await setSetting(SETTINGS_KEY, cfg);
}
async function handleView(interaction) {
    const cfg = await loadConfig();
    const staffUsers = cfg.staff.userIds.length
        ? cfg.staff.userIds.map(id => `<@${id}>`).join(", ")
        : "*none*";
    const staffRoles = cfg.staff.roleIds.length
        ? cfg.staff.roleIds.map(id => `<@&${id}>`).join(", ")
        : "*none*";
    const logChs = cfg.logChannels.length
        ? cfg.logChannels.map(c => `<#${c.channelId}> (guild \`${c.guildId}\`)`).join("\n> ")
        : "*none*";
    const pings = cfg.pingTargets.length
        ? cfg.pingTargets.map(p => {
            const scope = p.guildId ? `Guild \`${p.guildId}\`` : "**Global**";
            const roles = p.roleIds.map(r => `<@&${r}>`).join(" ");
            const users = p.userIds.map(u => `<@${u}>`).join(" ");
            return `${scope}: ${[roles, users].filter(Boolean).join(" ")}`;
        }).join("\n> ")
        : "*none*";
    await MessageHandler.raw(interaction, {
        components: [{
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: "## <:settings:1426875133385244703> App Config",
                    },
                    {
                        type: Constants.ComponentTypes.SEPARATOR,
                    },
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: [
                            `### Staff Users\n> ${staffUsers}`,
                            `### Staff Roles\n> ${staffRoles}`,
                            `### Log Channels\n> ${logChs}`,
                            `### Ping Targets\n> ${pings}`,
                        ].join("\n\n"),
                    },
                ],
            }],
    });
}
async function handleStaffAdd(interaction) {
    const opts = resolveOpts(interaction);
    const userId = opts.find((o) => o.name === "user")?.value;
    const roleId = opts.find((o) => o.name === "role")?.value;
    if (!userId && !roleId) {
        await MessageHandler.warning(interaction, "Provide a `user` or `role` to add.");
        return;
    }
    const cfg = await loadConfig();
    const added = [];
    if (userId && !cfg.staff.userIds.includes(userId)) {
        cfg.staff.userIds.push(userId);
        added.push(`<@${userId}> (user)`);
    }
    if (roleId && !cfg.staff.roleIds.includes(roleId)) {
        cfg.staff.roleIds.push(roleId);
        added.push(`<@&${roleId}> (role)`);
    }
    if (!added.length) {
        await MessageHandler.info(interaction, "Already added", "That user/role is already in the staff list.");
        return;
    }
    await saveConfig(cfg);
    await MessageHandler.success(interaction, `Added to staff: ${added.join(", ")}`);
}
async function handleStaffRemove(interaction) {
    const opts = resolveOpts(interaction);
    const userId = opts.find((o) => o.name === "user")?.value;
    const roleId = opts.find((o) => o.name === "role")?.value;
    if (!userId && !roleId) {
        await MessageHandler.warning(interaction, "Provide a `user` or `role` to remove.");
        return;
    }
    const cfg = await loadConfig();
    const removed = [];
    if (userId) {
        const idx = cfg.staff.userIds.indexOf(userId);
        if (idx !== -1) {
            cfg.staff.userIds.splice(idx, 1);
            removed.push(`<@${userId}>`);
        }
    }
    if (roleId) {
        const idx = cfg.staff.roleIds.indexOf(roleId);
        if (idx !== -1) {
            cfg.staff.roleIds.splice(idx, 1);
            removed.push(`<@&${roleId}>`);
        }
    }
    if (!removed.length) {
        await MessageHandler.info(interaction, "Not found", "That user/role wasn't in the staff list.");
        return;
    }
    await saveConfig(cfg);
    await MessageHandler.success(interaction, `Removed from staff: ${removed.join(", ")}`);
}
async function handleLogAdd(interaction) {
    const opts = resolveOpts(interaction);
    const channelId = opts.find((o) => o.name === "channel")?.value;
    const guildId = opts.find((o) => o.name === "guild_id")?.value
        ?? interaction.guild?.id;
    if (!channelId) {
        await MessageHandler.warning(interaction, "Provide a `channel`.");
        return;
    }
    if (!guildId) {
        await MessageHandler.warning(interaction, "Cannot determine guild ID. Provide `guild_id` explicitly.");
        return;
    }
    const cfg = await loadConfig();
    const already = cfg.logChannels.find(c => c.channelId === channelId);
    if (already) {
        await MessageHandler.info(interaction, "Already added", `<#${channelId}> is already a log channel.`);
        return;
    }
    cfg.logChannels.push({ guildId, channelId });
    await saveConfig(cfg);
    await MessageHandler.success(interaction, `Added <#${channelId}> as a log channel.`);
}
async function handleLogRemove(interaction) {
    const opts = resolveOpts(interaction);
    const channelId = opts.find((o) => o.name === "channel")?.value;
    if (!channelId) {
        await MessageHandler.warning(interaction, "Provide a `channel`.");
        return;
    }
    const cfg = await loadConfig();
    const idx = cfg.logChannels.findIndex(c => c.channelId === channelId);
    if (idx === -1) {
        await MessageHandler.info(interaction, "Not found", `<#${channelId}> is not a log channel.`);
        return;
    }
    cfg.logChannels.splice(idx, 1);
    await saveConfig(cfg);
    await MessageHandler.success(interaction, `Removed <#${channelId}> from log channels.`);
}
async function handlePingSet(interaction) {
    const opts = resolveOpts(interaction);
    // guild_id: explicit string, or current guild, or omitted for global
    const guildIdRaw = opts.find((o) => o.name === "guild_id")?.value;
    const guildId = guildIdRaw === "global" ? undefined
        : guildIdRaw ?? interaction.guild?.id;
    // roles and users as comma/space-separated IDs, plus convenience pickers
    const roleRaw = opts.find((o) => o.name === "role")?.value;
    const userRaw = opts.find((o) => o.name === "user")?.value;
    const rolesRaw = opts.find((o) => o.name === "role_ids")?.value;
    const usersRaw = opts.find((o) => o.name === "user_ids")?.value;
    const roleIds = [
        ...(roleRaw ? [roleRaw] : []),
        ...(rolesRaw ? rolesRaw.split(/[\s,]+/).filter(Boolean) : []),
    ];
    const userIds = [
        ...(userRaw ? [userRaw] : []),
        ...(usersRaw ? usersRaw.split(/[\s,]+/).filter(Boolean) : []),
    ];
    if (!roleIds.length && !userIds.length) {
        await MessageHandler.warning(interaction, "Provide at least one `role`, `user`, `role_ids`, or `user_ids`.");
        return;
    }
    const cfg = await loadConfig();
    const existing = cfg.pingTargets.findIndex(p => guildId ? p.guildId === guildId : !p.guildId);
    const entry = { guildId, roleIds, userIds };
    if (existing !== -1) {
        cfg.pingTargets[existing] = entry;
    }
    else {
        cfg.pingTargets.push(entry);
    }
    await saveConfig(cfg);
    const scope = guildId ? `guild \`${guildId}\`` : "**global**";
    const roleMens = roleIds.map(r => `<@&${r}>`).join(" ");
    const userMens = userIds.map(u => `<@${u}>`).join(" ");
    await MessageHandler.success(interaction, `Ping targets for ${scope} set to: ${[roleMens, userMens].filter(Boolean).join(" ")}`);
}
async function handlePingRemove(interaction) {
    const opts = resolveOpts(interaction);
    const guildIdRaw = opts.find((o) => o.name === "guild_id")?.value;
    const guildId = guildIdRaw === "global" ? undefined
        : guildIdRaw ?? interaction.guild?.id;
    const cfg = await loadConfig();
    const idx = cfg.pingTargets.findIndex(p => guildId ? p.guildId === guildId : !p.guildId);
    if (idx === -1) {
        const scope = guildId ? `guild \`${guildId}\`` : "global";
        await MessageHandler.info(interaction, "Not found", `No ping target set for ${scope}.`);
        return;
    }
    cfg.pingTargets.splice(idx, 1);
    await saveConfig(cfg);
    const scope = guildId ? `guild \`${guildId}\`` : "**global**";
    await MessageHandler.success(interaction, `Ping targets for ${scope} cleared.`);
}
function resolveOpts(interaction) {
    const raw = interaction.data.options;
    return raw?.[0]?.options ?? raw ?? [];
}
const handlers = {
    view: handleView,
    "staff-add": handleStaffAdd,
    "staff-remove": handleStaffRemove,
    "log-add": handleLogAdd,
    "log-remove": handleLogRemove,
    "ping-set": handlePingSet,
    "ping-remove": handlePingRemove,
};
export default {
    name: "config",
    description: "Manage bot configuration",
    ownerOnly: true,
    hidden: true,
    visibility: "ephemeral",
    options: [
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "view",
            description: "Show the current app configuration",
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "staff-add",
            description: "Grant owner-level access to a user or role",
            options: [
                { name: "user", description: "User to add", type: Constants.ApplicationCommandOptionTypes.USER, required: false },
                { name: "role", description: "Role to add", type: Constants.ApplicationCommandOptionTypes.ROLE, required: false },
            ],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "staff-remove",
            description: "Revoke owner-level access from a user or role",
            options: [
                { name: "user", description: "User to remove", type: Constants.ApplicationCommandOptionTypes.USER, required: false },
                { name: "role", description: "Role to remove", type: Constants.ApplicationCommandOptionTypes.ROLE, required: false },
            ],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "log-add",
            description: "Add a log channel",
            options: [
                { name: "channel", description: "Channel to log to", type: Constants.ApplicationCommandOptionTypes.CHANNEL, required: true },
                { name: "guild_id", description: "Guild ID (defaults to current)", type: Constants.ApplicationCommandOptionTypes.STRING, required: false },
            ],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "log-remove",
            description: "Remove a log channel",
            options: [
                { name: "channel", description: "Channel to remove", type: Constants.ApplicationCommandOptionTypes.CHANNEL, required: true },
            ],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "ping-set",
            description: "Set error-alert ping targets (per-guild or global)",
            options: [
                { name: "guild_id", description: 'Guild ID, or "global" for the fallback target', type: Constants.ApplicationCommandOptionTypes.STRING, required: false },
                { name: "role", description: "Role to ping (picker)", type: Constants.ApplicationCommandOptionTypes.ROLE, required: false },
                { name: "user", description: "User to ping (picker)", type: Constants.ApplicationCommandOptionTypes.USER, required: false },
                { name: "role_ids", description: "Extra role IDs (comma/space-separated)", type: Constants.ApplicationCommandOptionTypes.STRING, required: false },
                { name: "user_ids", description: "Extra user IDs (comma/space-separated)", type: Constants.ApplicationCommandOptionTypes.STRING, required: false },
            ],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
            name: "ping-remove",
            description: 'Clear ping targets for a guild or "global"',
            options: [
                { name: "guild_id", description: 'Guild ID, or "global"', type: Constants.ApplicationCommandOptionTypes.STRING, required: false },
            ],
        },
    ],
    async function(interaction) {
        const raw = interaction.data.options;
        const subName = raw?.[0]?.name;
        if (!subName || !handlers[subName]) {
            await MessageHandler.warning(interaction, "Unknown subcommand.");
            return;
        }
        await handlers[subName](interaction);
    },
};
