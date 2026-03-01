//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import app from "../../sys/appHandler.js";
const DM_ERROR_REASONS = {
    50007: "cannot send messages to this user (DMs closed or bot blocked)",
    10013: "unknown user — ID does not exist",
    50013: "missing permissions",
    40001: "unauthorized",
};
function friendlyDmError(err) {
    const code = err?.code ?? err?.response?.code;
    if (code && DM_ERROR_REASONS[code]) {
        return `${DM_ERROR_REASONS[code]} (code ${code})`;
    }
    return err?.message ?? String(err);
}
function parseUserIds(raw) {
    // Accept space, comma, or newline separators; strip <@mention> wrappers
    const tokens = raw
        .split(/[\s,]+/)
        .map(t => t.replace(/^<@!?(\d+)>$/, "$1").trim())
        .filter(Boolean);
    const ids = [];
    const invalid = [];
    for (const t of tokens) {
        if (/^\d{17,20}$/.test(t)) {
            ids.push(t);
        }
        else {
            invalid.push(t);
        }
    }
    return { ids, invalid };
}
async function dmUser(userId, payload) {
    try {
        const dmChannel = await app.getDMChannel(userId);
        await app.createMessage(dmChannel.id, payload);
        return { userId, ok: true };
    }
    catch (err) {
        return { userId, ok: false, reason: friendlyDmError(err) };
    }
}
export default {
    name: "dm",
    description: "Send a Components V2 message to one or more users via DM",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    visibility: "ephemeral",
    ownerOnly: true,
    hidden: true,
    options: [
        {
            name: "components",
            description: 'Components V2 JSON array, e.g. [{"type":17,"components":[{"type":10,"content":"hi"}]}]',
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
        {
            name: "user",
            description: "Single user to DM (use this or user_ids, not both)",
            type: Constants.ApplicationCommandOptionTypes.USER,
            required: false,
        },
        {
            name: "user_ids",
            description: "Space or comma-separated user IDs for bulk DMs (use this or user, not both)",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: false,
        },
    ],
    async function(interaction) {
        const raw = interaction.data.options;
        const opts = raw?.[0]?.options ??
            raw ??
            [];
        const componentsRaw = opts.find(o => o.name === "components")?.value;
        const pickedUserId = opts.find(o => o.name === "user")?.value;
        const bulkRaw = opts.find(o => o.name === "user_ids")?.value;
        if (!componentsRaw) {
            await MessageHandler.warning(interaction, "Missing `components` option.", true);
            return;
        }
        if (!pickedUserId && !bulkRaw) {
            await MessageHandler.warning(interaction, "Provide at least one target: `user` (picker) or `user_ids` (bulk string).", true);
            return;
        }
        let components;
        try {
            const parsed = JSON.parse(componentsRaw);
            if (!Array.isArray(parsed)) {
                await MessageHandler.error(interaction, "JSON must be a top-level array of component objects.", undefined, true);
                return;
            }
            components = parsed;
        }
        catch (err) {
            const msg = err instanceof SyntaxError ? err.message : String(err);
            await MessageHandler.error(interaction, `JSON parse failed: ${msg}`, "Check your JSON syntax and try again.", true);
            return;
        }
        const targetIds = new Set();
        const parseErrors = [];
        if (pickedUserId) {
            targetIds.add(pickedUserId);
        }
        if (bulkRaw) {
            const { ids, invalid } = parseUserIds(bulkRaw);
            for (const id of ids)
                targetIds.add(id);
            parseErrors.push(...invalid);
        }
        if (targetIds.size === 0) {
            await MessageHandler.error(interaction, "No valid user IDs could be parsed from `user_ids`.", parseErrors.length
                ? `Unrecognised tokens: ${parseErrors.map(e => `\`${e}\``).join(", ")}`
                : undefined, true);
            return;
        }
        const payload = {
            components,
            flags: Constants.MessageFlags.IS_COMPONENTS_V2,
        };
        const results = await Promise.all([...targetIds].map(id => dmUser(id, payload)));
        const succeeded = results.filter(r => r.ok);
        const failed = results.filter(r => !r.ok);
        const lines = [];
        if (succeeded.length) {
            lines.push(`**${succeeded.length} sent** — ${succeeded.map(r => `<@${r.userId}>`).join(", ")}`);
        }
        if (failed.length) {
            lines.push(`**${failed.length} failed:**`, ...failed.map(r => `> <@${r.userId}> — ${r.reason}`));
        }
        if (parseErrors.length) {
            lines.push(`**${parseErrors.length} skipped** (not valid IDs) — ${parseErrors.map(e => `\`${e}\``).join(", ")}`);
        }
        const allOk = failed.length === 0 && parseErrors.length === 0;
        const noneOk = succeeded.length === 0;
        const summary = lines.join("\n");
        if (allOk) {
            await MessageHandler.success(interaction, summary);
        }
        else if (noneOk) {
            await MessageHandler.error(interaction, "All DMs failed.", summary, true);
        }
        else {
            await MessageHandler.warning(interaction, summary);
        }
    },
};
