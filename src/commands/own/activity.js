//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { setActivity } from "../../sys/presence.js";
const TYPE_LABELS = {
    playing: "Playing",
    watching: "Watching",
    listening: "Listening to",
    competing: "Competing in",
    streaming: "Streaming",
};
export default {
    name: "activity",
    description: "Set Roxy's activity",
    visibility: "ephemeral",
    ownerOnly: true,
    hidden: true,
    options: [
        {
            name: "type",
            description: "Activity type",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
            choices: [
                { name: "Playing", value: "playing" },
                { name: "Watching", value: "watching" },
                { name: "Listening to", value: "listening" },
                { name: "Competing in", value: "competing" },
                { name: "Streaming", value: "streaming" },
            ],
        },
        {
            name: "text",
            description: "Activity text (e.g. 'Minecraft', 'a movie')",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
        {
            name: "url",
            description: "Stream URL (Twitch or YouTube — only used when type is Streaming)",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: false,
        },
    ],
    async function(interaction) {
        const type = getOption(interaction, "type");
        const text = getOption(interaction, "text").trim();
        const url = getOption(interaction, "url")?.trim();
        if (type === "streaming" && url) {
            const validUrl = url.startsWith("https://twitch.tv/") ||
                url.startsWith("https://www.twitch.tv/") ||
                url.startsWith("https://youtube.com/") ||
                url.startsWith("https://www.youtube.com/");
            if (!validUrl) {
                await MessageHandler.warning(interaction, "Streaming URL must be a Twitch or YouTube link — Discord only shows the status as streaming for those.");
                return;
            }
        }
        await setActivity({ type, text, url: type === "streaming" ? url : undefined });
        const label = TYPE_LABELS[type];
        const urlNote = type === "streaming" && url ? ` ([link](${url}))` : "";
        await MessageHandler.success(interaction, `Activity set to **${label} ${text}**${urlNote}.`);
    },
};
