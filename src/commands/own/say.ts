//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";

export default {
    name: "say",
    description: "Send a Components V2 message in the current",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,

    visibility: "public",
    ownerOnly: true,
    hidden: true,

    options: [
        {
            name: "components",
            description: 'Components V2 JSON — an array of top-level component objects, e.g. [{"type":17,...}]',
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
    ],

    async function(interaction: CommandInteraction) {
        const raw = interaction.data.options as any[] | undefined;
        const opts: any[] =
            raw?.[0]?.options ??
            raw ??
            [];

        const componentsRaw = opts.find(o => o.name === "components")?.value as string | undefined;

        if (!componentsRaw) {
            await MessageHandler.warning(interaction, "Missing `components` option.", true);
            return;
        }

        let components: any[];
        try {
            const parsed = JSON.parse(componentsRaw);
            if (!Array.isArray(parsed)) {
                await MessageHandler.error(
                    interaction,
                    "JSON must be a top-level array of component objects.",
                    undefined,
                    true
                );
                return;
            }
            components = parsed;
        } catch (err) {
            const msg = err instanceof SyntaxError ? err.message : String(err);
            await MessageHandler.error(
                interaction,
                `JSON parse failed: ${msg}`,
                "Check your JSON syntax and try again.",
                true
            );
            return;
        }

        const payload = {
            components,
            flags: Constants.MessageFlags.IS_COMPONENTS_V2,
        };

        try {
            return await MessageHandler.rawUnsafe(interaction, payload);
        } catch (err: any) {
            await MessageHandler.error(
                interaction,
                err?.message ?? String(err),
                `Failed to send message.`,
                true
            );
        }
    },
};