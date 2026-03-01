//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { resolveUser, rbx, RobloxError } from "../../commands/roblox/_api.js";
export default {
    name: "history",
    description: "Show a Roblox user's previous usernames",
    category: "<:roblox:1477118697402400939> Roblox",
    options: [
        {
            name: "user",
            description: "Roblox username or user ID",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
    ],
    async function(interaction) {
        const input = getOption(interaction, "user");
        let user;
        try {
            user = await resolveUser(input);
        }
        catch (err) {
            await MessageHandler.error(interaction, err instanceof RobloxError ? err.message : String(err));
            return;
        }
        let names;
        try {
            const data = await rbx(`https://users.roblox.com/v1/users/${user.id}/username-history?limit=50&sortOrder=Desc`);
            names = data.data?.map((e) => e.name) ?? [];
        }
        catch (err) {
            // Roblox returns 429 when a user has no username history — treat it as empty
            if (err instanceof RobloxError && err.status === 429) {
                await MessageHandler.info(interaction, "No username history", `**${user.name}** has never changed their username.`);
                return;
            }
            await MessageHandler.error(interaction, err instanceof RobloxError ? err.message : String(err));
            return;
        }
        if (!names.length) {
            await MessageHandler.info(interaction, "No username history", `**${user.name}** has never changed their username.`);
            return;
        }
        const lines = names.map((n, i) => `\`${String(i + 1).padStart(2, " ")}\` ${n}`).join("\n");
        await MessageHandler.raw(interaction, {
            components: [{
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `### <:roblox:1477118697402400939> **Username history for ${user.name}** (current) — ${names.length} previous name${names.length === 1 ? "" : "s"}`,
                        },
                        { type: Constants.ComponentTypes.SEPARATOR },
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: lines,
                        },
                    ],
                }],
        });
    },
};
