//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { setOnlineStatus, OnlineStatus } from "../../sys/presence.js";

const STATUS_LABELS: Record<OnlineStatus, string> = {
    online:    "Online",
    idle:      "Idle",
    dnd:       "Do Not Disturb",
    invisible: "Invisible",
};

export default {
    name: "status",
    description: "Set Roxy's online status",
    visibility: "ephemeral",
    ownerOnly: true,
    hidden: true,

    options: [
        {
            name: "status",
            description: "Online status to set",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
            choices: [
                { name: "Online",            value: "online"    },
                { name: "Idle",             value: "idle"      },
                { name: "Do Not Disturb",   value: "dnd"       },
                { name: "Invisible",        value: "invisible" },
            ],
        },
    ],

    async function(interaction: CommandInteraction) {
        const status = getOption<OnlineStatus>(interaction, "status")!;

        await setOnlineStatus(status);
        await MessageHandler.success(interaction, `Online status set to **${STATUS_LABELS[status]}**.`);
    },
};