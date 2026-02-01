//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction } from "@projectdysnomia/dysnomia";

const OWNER_ID = process.env.APP_OWNER_ID;

export function isOwner(interaction: CommandInteraction): boolean {
    if (!OWNER_ID) return false;
    return interaction.user?.id === OWNER_ID;
}
