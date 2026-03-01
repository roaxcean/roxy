//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import app from "../../sys/appHandler.js";
export default {
    name: "send",
    description: "Send (or edit) a Components V2 message in any channel",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    visibility: "ephemeral",
    guildOnly: true,
    ownerOnly: true,
    hidden: true,
    options: [
        {
            name: "components",
            description: 'Components V2 JSON — an array of top-level component objects, e.g. [{"type":17,...}]',
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
        {
            name: "channel",
            description: "Channel to send the message in",
            type: Constants.ApplicationCommandOptionTypes.CHANNEL,
            required: true,
        },
        {
            name: "message_id",
            description: "ID of an existing message to edit instead of sending a new one",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: false,
        },
    ],
    async function(interaction) {
        const raw = interaction.data.options;
        const opts = raw?.[0]?.options ?? // subcommand invocation
            raw ?? // top-level invocation
            [];
        const componentsRaw = opts.find(o => o.name === "components")?.value;
        const channelId = opts.find(o => o.name === "channel")?.value;
        const messageId = opts.find(o => o.name === "message_id")?.value;
        if (!componentsRaw || !channelId) {
            await MessageHandler.warning(interaction, "Missing required options.", true);
            return;
        }
        let components;
        try {
            const parsed = JSON.parse(componentsRaw);
            if (!Array.isArray(parsed)) {
                await MessageHandler.error(interaction, "JSON must be an array of top-level component objects.", undefined, true);
                return;
            }
            components = parsed;
        }
        catch (err) {
            // Show the raw parse error so the user knows exactly what went wrong
            const message = err instanceof SyntaxError ? err.message : String(err);
            await MessageHandler.error(interaction, `JSON parse failed: ${message}`, "Check your JSON syntax and try again.", true);
            return;
        }
        const payload = {
            components,
            flags: Constants.MessageFlags.IS_COMPONENTS_V2,
        };
        try {
            if (messageId) {
                await app.editMessage(channelId, messageId, payload);
                await MessageHandler.success(interaction, `Message [\`${messageId}\`](https://discord.com/channels/${interaction.guild.id ?? "@me"}/${channelId}/${messageId}) updated.`);
            }
            else {
                const sent = await app.createMessage(channelId, payload);
                await MessageHandler.success(interaction, `Message sent <:arrowr:1426686528276529313> [**jump**](https://discord.com/channels/${interaction.guild.id ?? "@me"}/${channelId}/${sent.id})`);
            }
        }
        catch (err) {
            await MessageHandler.error(interaction, err?.message ?? String(err), messageId
                ? `Failed to edit message \`${messageId}\` in <#${channelId}>.`
                : `Failed to send message to <#${channelId}>.`, true);
        }
    },
};
