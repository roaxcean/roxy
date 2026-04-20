//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

// custom_id format: "help_page_{page}"

// because each button encodes the target page in its custom_id, no external
// state is needed, the handler just parses the number and re-renders

import { ComponentInteraction, Constants } from "@projectdysnomia/dysnomia";
import { buildHelpPage } from "../commands/help.js";

export default async function handleHelpPage(interaction: ComponentInteraction): Promise<void> {
    const raw  = interaction.data.custom_id; // e.g. "help_page_2"
    const page = parseInt(raw.split("_").pop() ?? "0", 10);
    const safePageNum = isNaN(page) ? 0 : page;

    const { components } = await buildHelpPage(safePageNum);

    await (interaction as any).editOriginalMessage({
        components,
        flags: Constants.MessageFlags.IS_COMPONENTS_V2,
    });
}