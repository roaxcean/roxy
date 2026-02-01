//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";
import { loadCommands } from "../sys/service.js";

export default {
    name: "help",
    description: "Show all available commands",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    visibility: "public",

    async function(interaction: CommandInteraction) {
        const commands = await loadCommands();

        const grouped = new Map<string, typeof commands>();

        for (const cmd of commands) {
            const category = cmd.category ?? "General";

            if (!grouped.has(category)) grouped.set(category, []);
            grouped.get(category)!.push(cmd);
        }

        const components: any[] = [
            {
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: "## <:question:1426873669992321056> Roxy Help",
                    },
                ],
            },
        ];

        for (const [category, cmds] of grouped) {
            const lines: string[] = [];

            for (const cmd of cmds) {
                // top-level command
                if (!cmd.options || cmd.options.length === 0) {
                    lines.push(`> **\`/${cmd.name}\`** — ${cmd.description ?? "No description"}`);
                } else {
                    // subcommands
                    lines.push(`> **\`/${cmd.name}\`** — ${cmd.description ?? "No description"}`);
                    for (const sub of cmd.options) {
                        lines.push(`>   • **\`/${cmd.name} ${sub.name}\`** — ${sub.description ?? "No description"}`);
                    }
                }
            }

            components.push({
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: [`### ${category}`, ...lines].join("\n"),
                    },
                ],
            });
        }

        await MessageHandler.raw(interaction, {
            components,
        });
    },
};
