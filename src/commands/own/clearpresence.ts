//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { resetPresence } from "../../sys/presence.js";

export default {
    name: "clearpresence",
    description: "Reset Roxy's presence to the default (idle + custom status)",
    visibility: "ephemeral",
    ownerOnly: true,
    hidden: true,

    async function(interaction: CommandInteraction) {
        await resetPresence();
        await MessageHandler.success(interaction, "Presence reset to default.");
    },
};