//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

// custom_id format: "system_page_{page}"

import { ComponentInteraction, Constants } from "@projectdysnomia/dysnomia";
import { buildSystemPage } from "../commands/system.js";

export default async function handleSystemPage(interaction: ComponentInteraction): Promise<void> {
    const raw  = interaction.data.custom_id; // e.g. "system_page_1"
    const page = parseInt(raw.split("_").pop() ?? "0", 10);
    const safe = isNaN(page) ? 0 : page;

    const { components } = buildSystemPage(safe);

    await (interaction as any).editOriginalMessage({
        components,
        flags: Constants.MessageFlags.IS_COMPONENTS_V2,
    });
}
