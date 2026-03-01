//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
/**
 * Resolve the flat options array from an interaction, handling both
 * top-level commands and subcommand nesting transparently.
 */
export function resolveOptions(interaction) {
    const raw = interaction.data.options;
    return raw?.[0]?.options ?? raw ?? [];
}
export function getOption(interaction, name) {
    return resolveOptions(interaction).find((o) => o.name === name)?.value;
}
