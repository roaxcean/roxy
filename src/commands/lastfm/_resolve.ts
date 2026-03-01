//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction } from "@projectdysnomia/dysnomia";
import { getOption } from "../../sys/optionResolver.js";
import { getUserValue } from "../../sys/userStore.js";

/**
 * Resolve a Last.fm username for an interaction:
 * 1. `username` option (explicit override)
 * 2. Stored username for the invoking user
 *
 * Returns the username string, or null if neither is available.
 */
export async function resolveUsername(interaction: CommandInteraction): Promise<string | null> {
    const fromOption = getOption<string>(interaction, "username");
    if (fromOption) return fromOption.trim();

    const userId = interaction.user?.id ?? interaction.member?.id;
    if (!userId) return null;

    return getUserValue<string>(userId, "lastfm_username");
}

/** Standard "username option" definition — attach to any lastfm subcommand */
export const USERNAME_OPTION = {
    name: "username",
    description: "Last.fm username (uses your linked account if omitted)",
    type: 3, // STRING
    required: false,
};