// src/commands/help.ts
import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";
import { getCommandsForHelp } from "../sys/commandRegistry.js";

export default {
    name: "help",
    description: "Show all available commands",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    visibility: "public",

    usage: "goodbye lollll",

    async function(interaction: CommandInteraction) {
        const commands = await getCommandsForHelp();

        const grouped = new Map<string, typeof commands>();

        for (const cmd of commands) {
            const category = cmd.category ?? "General";
            if (!grouped.has(category)) grouped.set(category, []);
            grouped.get(category)!.push(cmd);
        }

        const components = [
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
            components.push({
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: [
                            `### ${category}`,
                            ...cmds.map(c =>
                                `> **\`/${c.name}\`** — ${c.description ?? "No description"}`
                            ),
                        ].join("\n"),
                    },
                ],
            });
        }

        await MessageHandler.raw(interaction, {
            components,
        });
    },
};
