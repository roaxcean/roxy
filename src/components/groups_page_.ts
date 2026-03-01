//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

// custom_id format: "groups_page_{userId}_{page}"

import { ComponentInteraction, Constants } from "@projectdysnomia/dysnomia";
import { buildGroupsPage } from "../commands/roblox/groups.js";
import { robloxCache, GroupsCacheEntry } from "../sys/robloxCache.js";

export default async function handleGroupsPage(interaction: ComponentInteraction): Promise<void> {
    const parts    = interaction.data.custom_id.split("_"); // ["groups","page",userId,page]
    const userId   = parseInt(parts[2], 10);
    const page     = parseInt(parts[3], 10);
    const safePage = isNaN(page) ? 0 : page;

    const cached = robloxCache.get<GroupsCacheEntry>(`groups:${userId}`);
    if (!cached) {
        await (interaction as any).createMessage({
            content: "This list has expired — please run `/groups` again.",
            flags: 64,
        });
        return;
    }

    const { user, memberships } = cached;
    const { components } = await buildGroupsPage(user, memberships, safePage);

    await (interaction as any).editOriginalMessage({
        components,
        flags: Constants.MessageFlags.IS_COMPONENTS_V2,
    });
}
