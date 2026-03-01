//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { resolveUser, getAvatarUrl, rbx, fmtNum, fmtDate, trunc, RobloxError } from "./_api.js";

export default {
    name: "profile",
    description: "Show a Roblox user's profile summary",
    category: "<:roblox:1477118697402400939> Roblox",
    options: [
        {
            name: "user",
            description: "Roblox username or user ID",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
    ],

    async function(interaction: CommandInteraction) {
        const input = getOption<string>(interaction, "user")!;

        let user: any;
        try {
            user = await resolveUser(input);
        } catch (err) {
            await MessageHandler.error(interaction, err instanceof RobloxError ? err.message : String(err));
            return;
        }

        // fFetch friends count, followers, followings, groups in parallel; best effort
        const [friendsData, followersData, followingsData, groupsData, avatarUrl] = await Promise.allSettled([
            rbx<{ count: number }>(`https://friends.roblox.com/v1/users/${user.id}/friends/count`),
            rbx<{ count: number }>(`https://friends.roblox.com/v1/users/${user.id}/followers/count`),
            rbx<{ count: number }>(`https://friends.roblox.com/v1/users/${user.id}/followings/count`),
            rbx<{ data: any[] }>(`https://groups.roblox.com/v1/users/${user.id}/groups/roles?includeLocked=false`),
            getAvatarUrl(user.id, "AvatarThumbnail", "420x420"),
        ]);

        const friends   = friendsData.status   === "fulfilled" ? fmtNum(friendsData.value.count)   : "?";
        const followers = followersData.status === "fulfilled" ? fmtNum(followersData.value.count) : "?";
        const following = followingsData.status === "fulfilled" ? fmtNum(followingsData.value.count) : "?";
        const groupCount = groupsData.status === "fulfilled" ? groupsData.value.data?.length ?? 0 : "?";
        const thumb = avatarUrl.status === "fulfilled" ? avatarUrl.value : null;

        const displayLine = user.displayName !== user.name
            ? `**${user.displayName}** (@${user.name})`
            : `**${user.name}**`;

        const badges = [
            user.hasVerifiedBadge ? "<:verified:1477470409602502898> Verified" : null,
            user.isBanned ? "<:usercross:1477470612703154396> Banned" : null,
        ].filter(Boolean).join("  ");

        const desc = user.description?.trim()
            ? trunc(user.description.trim().replace(/\n+/g, " "), 200)
            : null;

        const lines = [
            `### <:roblox:1477118697402400939> [${displayLine}](https://www.roblox.com/users/profile?username=${user.name})`,
            badges || null,
            `<:hashtag:1477318314882633758> ID \`${user.id}\`  ·  <:callendar:1477359937926594690> Joined ${fmtDate(user.created)}`,
            ``,
            `**${friends}** friends  ·  **${followers}** followers  ·  **${following}** following`,
            `Member of **${groupCount}** group${groupCount === 1 ? "" : "s"}`,
            desc ? `\n> ${desc}` : null,
        ].filter(v => v !== null).join("\n");

        const innerComponents: any[] = [];

        if (thumb) {
            innerComponents.push({
                type: Constants.ComponentTypes.SECTION,
                components: [{ type: Constants.ComponentTypes.TEXT_DISPLAY, content: lines }],
                accessory: { type: Constants.ComponentTypes.THUMBNAIL, media: { url: thumb } },
            });
        } else {
            innerComponents.push({ type: Constants.ComponentTypes.TEXT_DISPLAY, content: lines });
        }

        await MessageHandler.raw(interaction, {
            components: [{ type: Constants.ComponentTypes.CONTAINER, components: innerComponents }],
        });
    },
};