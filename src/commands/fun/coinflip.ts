//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";

export default {
    name: "coinflip",
    description: "Flip a coin",

    async function(interaction: CommandInteraction) {
        const result = Math.random() < 0.5 ? "heads" : "tails";
        await MessageHandler.raw(interaction, {
            components: [
                {
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `## <:coin:1477307686180880444> Coin down!`,
                        },
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `> The result is... ||${result}!||`,
                        }
                    ],
                }
            ],
        });
    },
};