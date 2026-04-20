//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

// custom_id format: "friends_page_{userId}_{page}"

import { ComponentInteraction, Constants } from "@projectdysnomia/dysnomia";
import { buildFriendsPage } from "../commands/roblox/friends.js";
import { robloxCache, FriendsCacheEntry } from "../sys/robloxCache.js";

export default async function handleFriendsPage(interaction: ComponentInteraction): Promise<void> {
    const parts    = interaction.data.custom_id.split("_"); // ["friends","page",userId,page]
    const userId   = parseInt(parts[2], 10);
    const page     = parseInt(parts[3], 10);
    const safePage = isNaN(page) ? 0 : page;

    const cached = robloxCache.get<FriendsCacheEntry>(`friends:${userId}`);
    if (!cached) {
        await (interaction as any).createMessage({
            content: "This list has expired — please run `/friends` again.",
            flags: 64,
        });
        return;
    }

    const { user, resolved, friendIds } = cached;
    const { components } = await buildFriendsPage(user, resolved, friendIds.length, safePage);

    await (interaction as any).editOriginalMessage({
        components,
        flags: Constants.MessageFlags.IS_COMPONENTS_V2,
    });
}
