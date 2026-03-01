//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

// custom_id format: "groupgames_page_{groupId}_{page}"

import { ComponentInteraction, Constants } from "@projectdysnomia/dysnomia";
import { buildGroupGamesPage } from "../commands/roblox/group.js";
import { robloxCache, GroupGamesCacheEntry } from "../sys/robloxCache.js";

export default async function handleGroupGamesPage(interaction: ComponentInteraction): Promise<void> {
    const parts    = interaction.data.custom_id.split("_"); // ["groupgames","page",groupId,page]
    const groupId  = parseInt(parts[2], 10);
    const page     = parseInt(parts[3], 10);
    const safePage = isNaN(page) ? 0 : page;

    const cached = robloxCache.get<GroupGamesCacheEntry>(`groupgames:${groupId}`);
    if (!cached) {
        await (interaction as any).createMessage({
            content: "This list has expired — please run `/group` again.",
            flags: 64,
        });
        return;
    }

    const { group, games, statsMap } = cached;
    const { components } = await buildGroupGamesPage(group, games, statsMap, safePage);

    await (interaction as any).editOriginalMessage({
        components,
        flags: Constants.MessageFlags.IS_COMPONENTS_V2,
    });
}
