//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { resolveUser, rbx, fmtNum, trunc, RobloxError } from "./_api.js";
import { robloxCache } from "../../sys/robloxCache.js";
export const FRIENDS_PER_PAGE = 20;
export async function buildFriendsPage(user, resolved, totalCount, page) {
    const totalPages = Math.max(1, Math.ceil(resolved.length / FRIENDS_PER_PAGE));
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const slice = resolved.slice(safePage * FRIENDS_PER_PAGE, safePage * FRIENDS_PER_PAGE + FRIENDS_PER_PAGE);
    const lines = slice.map((f, i) => {
        const rank = String(safePage * FRIENDS_PER_PAGE + i + 1).padStart(2, " ");
        const uname = f.name ?? "?";
        const dname = f.displayName ?? uname;
        const display = dname !== uname
            ? `[${trunc(dname, 20)} (@${trunc(uname, 20)})](https://www.roblox.com/users/profile?username=${uname})`
            : `[@${trunc(uname, 30)}](https://www.roblox.com/users/profile?username=${uname})`;
        return `\`${rank}\` ${display}`;
    }).join("\n");
    const components = [
        {
            type: Constants.ComponentTypes.CONTAINER,
            components: [
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `### <:roblox:1477118697402400939> **Friends of [@${user.name}](https://www.roblox.com/users/profile?username=${user.name})** (${fmtNum(totalCount)} total)`,
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
                            custom_id: `friends_page_${user.id}_${safePage - 1}`,
                            label: "← Previous",
                            disabled: safePage === 0,
                        },
                        {
                            type: Constants.ComponentTypes.BUTTON,
                            style: Constants.ButtonStyles.SECONDARY,
                            custom_id: `friends_page_${user.id}_${safePage + 1}`,
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
    name: "friends",
    description: "List a Roblox user's friends",
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
        let friendIds;
        try {
            const data = await rbx(`https://friends.roblox.com/v1/users/${user.id}/friends`);
            friendIds = (data.data ?? []).map((f) => f.id);
        }
        catch (err) {
            await MessageHandler.error(interaction, err instanceof RobloxError ? err.message : String(err));
            return;
        }
        if (!friendIds.length) {
            await MessageHandler.info(interaction, "No friends", `**${user.name}** has no friends listed.`);
            return;
        }
        let resolved;
        try {
            const data = await rbx("https://users.roblox.com/v1/users", {
                method: "POST",
                body: JSON.stringify({ userIds: friendIds.slice(0, 100), excludeBannedUsers: false }),
            });
            resolved = data.data ?? [];
        }
        catch (err) {
            await MessageHandler.error(interaction, err instanceof RobloxError ? err.message : String(err));
            return;
        }
        resolved.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        robloxCache.set(`friends:${user.id}`, { user, resolved, friendIds });
        const { components } = await buildFriendsPage(user, resolved, friendIds.length, 0);
        await MessageHandler.raw(interaction, { components });
    },
};
