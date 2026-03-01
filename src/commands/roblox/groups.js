//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { resolveUser, rbx, trunc, RobloxError } from "./_api.js";
import { robloxCache } from "../../sys/robloxCache.js";
export const GROUPS_PER_PAGE = 20;
export async function buildGroupsPage(user, memberships, page) {
    const totalPages = Math.max(1, Math.ceil(memberships.length / GROUPS_PER_PAGE));
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const slice = memberships.slice(safePage * GROUPS_PER_PAGE, safePage * GROUPS_PER_PAGE + GROUPS_PER_PAGE);
    const lines = slice.map((m, i) => {
        const rank = String(safePage * GROUPS_PER_PAGE + i + 1).padStart(2, " ");
        const groupName = `[${trunc(m.group?.name ?? "Unknown", 28)}](https://www.roblox.com/communities/${m.group?.id ?? "0"})`;
        const role = trunc(m.role?.name ?? "Member", 22);
        return `\`${rank}\` **${groupName}** — *${role}*`;
    }).join("\n");
    const components = [
        {
            type: Constants.ComponentTypes.CONTAINER,
            components: [
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `### <:roblox:1477118697402400939> **Groups for [@${user.name}](https://www.roblox.com/users/profile?username=${user.name})** (${memberships.length} total)`,
                },
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `-# Page ${safePage + 1} of ${totalPages}`,
                },
            ],
        },
        {
            type: Constants.ComponentTypes.CONTAINER,
            components: [
                { type: Constants.ComponentTypes.SEPARATOR },
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: lines,
                },
            ],
        },
    ];
    if (totalPages > 1) {
        components.push({
            type: Constants.ComponentTypes.CONTAINER,
            components: [{
                    type: Constants.ComponentTypes.ACTION_ROW,
                    components: [
                        {
                            type: Constants.ComponentTypes.BUTTON,
                            style: Constants.ButtonStyles.SECONDARY,
                            custom_id: `groups_page_${user.id}_${safePage - 1}`,
                            label: "← Previous",
                            disabled: safePage === 0,
                        },
                        {
                            type: Constants.ComponentTypes.BUTTON,
                            style: Constants.ButtonStyles.SECONDARY,
                            custom_id: `groups_page_${user.id}_${safePage + 1}`,
                            label: "Next →",
                            disabled: safePage === totalPages - 1,
                        },
                    ],
                }],
        });
    }
    return { components, page: safePage, totalPages };
}
export default {
    name: "groups",
    description: "List groups a Roblox user is a member of",
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
        let memberships;
        try {
            const data = await rbx(`https://groups.roblox.com/v1/users/${user.id}/groups/roles?includeLocked=false`);
            memberships = data.data ?? [];
        }
        catch (err) {
            await MessageHandler.error(interaction, err instanceof RobloxError ? err.message : String(err));
            return;
        }
        if (!memberships.length) {
            await MessageHandler.info(interaction, "No groups", `**${user.name}** is not in any groups.`);
            return;
        }
        robloxCache.set(`groups:${user.id}`, { user, memberships });
        const { components } = await buildGroupsPage(user, memberships, 0);
        await MessageHandler.raw(interaction, { components });
    },
};
