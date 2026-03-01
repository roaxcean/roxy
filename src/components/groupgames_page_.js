//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
// custom_id format: "groupgames_page_{groupId}_{page}"
import { Constants } from "@projectdysnomia/dysnomia";
import { buildGroupGamesPage } from "../commands/roblox/group.js";
import { robloxCache } from "../sys/robloxCache.js";
export default async function handleGroupGamesPage(interaction) {
    const parts = interaction.data.custom_id.split("_"); // ["groupgames","page",groupId,page]
    const groupId = parseInt(parts[2], 10);
    const page = parseInt(parts[3], 10);
    const safePage = isNaN(page) ? 0 : page;
    const cached = robloxCache.get(`groupgames:${groupId}`);
    if (!cached) {
        await interaction.createMessage({
            content: "This list has expired — please run `/group` again.",
            flags: 64,
        });
        return;
    }
    const { group, games, statsMap } = cached;
    const { components } = await buildGroupGamesPage(group, games, statsMap, safePage);
    await interaction.editOriginalMessage({
        components,
        flags: Constants.MessageFlags.IS_COMPONENTS_V2,
    });
}
