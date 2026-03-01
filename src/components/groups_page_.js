//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
// custom_id format: "groups_page_{userId}_{page}"
import { Constants } from "@projectdysnomia/dysnomia";
import { buildGroupsPage } from "../commands/roblox/groups.js";
import { robloxCache } from "../sys/robloxCache.js";
export default async function handleGroupsPage(interaction) {
    const parts = interaction.data.custom_id.split("_"); // ["groups","page",userId,page]
    const userId = parseInt(parts[2], 10);
    const page = parseInt(parts[3], 10);
    const safePage = isNaN(page) ? 0 : page;
    const cached = robloxCache.get(`groups:${userId}`);
    if (!cached) {
        await interaction.createMessage({
            content: "This list has expired — please run `/groups` again.",
            flags: 64,
        });
        return;
    }
    const { user, memberships } = cached;
    const { components } = await buildGroupsPage(user, memberships, safePage);
    await interaction.editOriginalMessage({
        components,
        flags: Constants.MessageFlags.IS_COMPONENTS_V2,
    });
}
