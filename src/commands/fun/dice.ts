//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";

export default {
    name: "dice",
    description: "Roll dice using standard notation (e.g. 2d6, 1d20)",
    options: [
        {
            name: "notation",
            description: "Dice notation, e.g. 2d6 or 1d20 (default: 1d6)",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: false,
        },
    ],

    async function(interaction: CommandInteraction) {
        const notation = getOption<string>(interaction, "notation") ?? "1d6";
        const match    = notation.trim().toLowerCase().match(/^(\d+)d(\d+)$/);

        if (!match) {
            await MessageHandler.warning(interaction, `Invalid notation \`${notation}\`. Use format like \`2d6\` or \`1d20\`.`);
            return;
        }

        const count = Math.min(parseInt(match[1], 10), 20);
        const sides = Math.min(parseInt(match[2], 10), 1000);

        if (count < 1 || sides < 2) {
            await MessageHandler.warning(interaction, "Need at least 1 die with at least 2 sides.");
            return;
        }

        const rolls  = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
        const total  = rolls.reduce((a, b) => a + b, 0);
        const detail = count > 1 ? `\n> -# ${rolls.join(" + ")} = **${total}**` : "";

        await MessageHandler.raw(interaction, {
            components: [{
                type: Constants.ComponentTypes.CONTAINER,
                components: [{
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `## <:box:1477309442751074437> Dice down!\n> Result: **${total}**${detail}`,
                }, {
                    type: Constants.ComponentTypes.SEPARATOR
                }, {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `-# Dice notation used: \`${notation}\`.`
                }],
            }],
        });
    },
};