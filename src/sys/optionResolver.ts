//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction } from "@projectdysnomia/dysnomia";

/**
 * Resolve the flat options array from an interaction, handling both
 * top-level commands and subcommand nesting transparently.
 */
export function resolveOptions(interaction: CommandInteraction): any[] {
    const raw = interaction.data.options as any[] | undefined;
    return raw?.[0]?.options ?? raw ?? [];
}

export function getOption<T = string>(
    interaction: CommandInteraction,
    name: string
): T | undefined {
    return resolveOptions(interaction).find((o: any) => o.name === name)?.value as T | undefined;
}