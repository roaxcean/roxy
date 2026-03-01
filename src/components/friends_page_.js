//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
// custom_id format: "friends_page_{userId}_{page}"
// Data is served from the in-memory cache written by the slash command.
// If the cache has expired (5 min TTL) the user is told to re-run /friends.
import { Constants } from "@projectdysnomia/dysnomia";
import { buildFriendsPage } from "../commands/roblox/friends.js";
import { robloxCache } from "../sys/robloxCache.js";
export default async function handleFriendsPage(interaction) {
    const parts = interaction.data.custom_id.split("_"); // ["friends","page",userId,page]
    const userId = parseInt(parts[2], 10);
    const page = parseInt(parts[3], 10);
    const safePage = isNaN(page) ? 0 : page;
    const cached = robloxCache.get(`friends:${userId}`);
    if (!cached) {
        await interaction.createMessage({
            content: "This list has expired — please run `/friends` again.",
            flags: 64,
        });
        return;
    }
    const { user, resolved, friendIds } = cached;
    const { components } = await buildFriendsPage(user, resolved, friendIds.length, safePage);
    await interaction.editOriginalMessage({
        components,
        flags: Constants.MessageFlags.IS_COMPONENTS_V2,
    });
}
