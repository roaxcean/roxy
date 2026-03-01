//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { setUserValue } from "../../sys/userStore.js";
import { lfm, LastfmError } from "./_api.js";

export default {
    name: "set",
    description: "Link your Last.fm username to your Discord account",
    options: [
        {
            name: "username",
            description: "Your Last.fm username",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
    ],
    category: "<:lastfm:1477120010534256781> Last.fm",

    async function(interaction: CommandInteraction) {
        const username = getOption<string>(interaction, "username")!.trim();
        const userId   = interaction.user?.id ?? interaction.member?.id!;

        try {
            await lfm("user.getInfo", { user: username });
        } catch (err) {
            if (err instanceof LastfmError && err.code === 6) {
                await MessageHandler.warning(interaction, `\`${username}\` was not found on Last.fm.`);
            } else {
                await MessageHandler.error(interaction, err instanceof Error ? err.message : String(err));
            }
            return;
        }

        await setUserValue(userId, "lastfm_username", username);
        await MessageHandler.success(interaction, `Linked your account to **${username}** on Last.fm.`);
    },
};