//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { setCustomStatus } from "../../sys/presence.js";
export default {
    name: "customstatus",
    description: "Set Roxy's custom status text",
    visibility: "ephemeral",
    ownerOnly: true,
    hidden: true,
    options: [
        {
            name: "text",
            description: "Custom status text",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
    ],
    async function(interaction) {
        const text = getOption(interaction, "text").trim();
        await setCustomStatus(text);
        await MessageHandler.success(interaction, `Custom status set to **${text}**.`);
    },
};
