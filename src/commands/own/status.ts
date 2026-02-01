//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { setCustomStatus } from "../../sys/presence.js";
import {MessageHandler} from "../../sys/messageHandler.js";

export default {
    name: "status",
    description: "Update roxy's status",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,

    visibility: "public",
    hidden: false,
    ownerOnly: true,

    options: [
        {
            name: "text",
            description: "Custom status text",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        }
    ],

    async function(interaction: CommandInteraction) {
        const text = interaction.data.options?.find(o => o.name === "text")?.value as string;

        await setCustomStatus(text);

        MessageHandler.success(interaction, "Status changed successfully!");
    },
};