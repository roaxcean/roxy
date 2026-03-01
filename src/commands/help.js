//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";
import { getCommandsForHelp } from "../sys/commandRegistry.js";
// preferred category display order, anything unlisted goes at the end
const CATEGORY_ORDER = [
    "<:info:1467501339729727662> General", "<:roblox:1477118697402400939> Roblox",
    "<:lastfm:1477120010534256781> Last.fm", "<:volt:1426666376197701683> VoltRadio"
];
export const CATEGORIES_PER_PAGE = 2;
function sortCategories(entries) {
    return entries.sort(([a], [b]) => {
        const ai = CATEGORY_ORDER.indexOf(a);
        const bi = CATEGORY_ORDER.indexOf(b);
        if (ai === -1 && bi === -1)
            return a.localeCompare(b);
        if (ai === -1)
            return 1;
        if (bi === -1)
            return -1;
        return ai - bi;
    });
}
/** Build the lines for a single category block. Returns null if nothing visible. */
function buildCategoryBlock(category, cmds) {
    const lines = [];
    for (const cmd of cmds) {
        const subs = cmd.options?.filter((o) => o.type === Constants.ApplicationCommandOptionTypes.SUB_COMMAND) ?? [];
        if (subs.length > 0) {
            for (const sub of subs) {
                if (sub.hidden)
                    continue;
                lines.push(`> **\`/${cmd.name} ${sub.name}\`** — ${sub.description ?? "No description"}`);
            }
        }
        else {
            lines.push(`> **\`/${cmd.name}\`** — ${cmd.description ?? "No description"}`);
        }
    }
    if (!lines.length)
        return null;
    return [`### ${category}`, ...lines].join("\n");
}
/**
 * Build the full paginated help payload for a given page index (0-based).
 * Exported so the component handler can reuse it without duplicating logic.
 */
export async function buildHelpPage(page) {
    const commands = await getCommandsForHelp();
    const grouped = new Map();
    for (const cmd of commands) {
        const cat = cmd.category ?? "<:info:1467501339729727662> General";
        if (!grouped.has(cat))
            grouped.set(cat, []);
        grouped.get(cat).push(cmd);
    }
    const sortedEntries = sortCategories([...grouped.entries()]);
    const blocks = [];
    for (const [category, cmds] of sortedEntries) {
        const content = buildCategoryBlock(category, cmds);
        if (content)
            blocks.push({ category, content });
    }
    const totalPages = Math.max(1, Math.ceil(blocks.length / CATEGORIES_PER_PAGE));
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const slice = blocks.slice(safePage * CATEGORIES_PER_PAGE, safePage * CATEGORIES_PER_PAGE + CATEGORIES_PER_PAGE);
    const components = [
        {
            type: Constants.ComponentTypes.CONTAINER,
            components: [
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: "## <:question:1426873669992321056> How-To Roxy",
                },
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `-# Page ${safePage + 1} of ${totalPages}`,
                },
            ],
        },
    ];
    for (const block of slice) {
        components.push({
            type: Constants.ComponentTypes.CONTAINER,
            components: [{
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: block.content,
                }],
        });
    }
    // only shown when there is more than one page
    if (totalPages > 1) {
        const prevDisabled = safePage === 0;
        const nextDisabled = safePage === totalPages - 1;
        components.push({
            type: Constants.ComponentTypes.CONTAINER,
            components: [{
                    type: Constants.ComponentTypes.ACTION_ROW,
                    components: [
                        {
                            type: Constants.ComponentTypes.BUTTON,
                            style: Constants.ButtonStyles.SECONDARY,
                            custom_id: `help_page_${safePage - 1}`,
                            label: "← Previous",
                            disabled: prevDisabled,
                        },
                        {
                            type: Constants.ComponentTypes.BUTTON,
                            style: Constants.ButtonStyles.SECONDARY,
                            custom_id: `help_page_${safePage + 1}`,
                            label: "Next →",
                            disabled: nextDisabled,
                        },
                    ],
                }],
        });
    }
    return { components, page: safePage, totalPages };
}
export default {
    name: "help",
    description: "Show all available commands",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    visibility: "public",
    category: "<:info:1467501339729727662> General",
    async function(interaction) {
        const { components } = await buildHelpPage(0);
        await MessageHandler.raw(interaction, { components });
    },
};
