//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { isStaff } from "./appConfig.js";
/**
 * Check whether an interaction is allowed to run a command.
 * Subcommands inherit all restrictions from the parent — no exceptions.
 *
 * Staff check covers:
 *   • user IDs listed in appConfig.staff.userIds
 *   • role IDs listed in appConfig.staff.roleIds (matched against member roles)
 */
export async function checkPermissions(interaction, command) {
    if (command.guildOnly && !interaction.guild?.id) {
        return { allowed: false, reason: "guildOnly" };
    }
    if (command.ownerOnly) {
        const userId = interaction.user?.id ?? interaction.member?.id ?? "";
        const roles = (interaction.member?.roles ?? []);
        const allowed = await isStaff(userId, roles);
        if (!allowed)
            return { allowed: false, reason: "ownerOnly" };
    }
    return { allowed: true };
}
export const PERMISSION_MESSAGES = {
    guildOnly: "This command can only be used in servers.",
    ownerOnly: "This command is restricted to bot staff.",
};
