//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { rbx, fmtNum, trunc, RobloxError } from "./_api.js";
import { robloxCache } from "../../sys/robloxCache.js";
export const GAMES_PER_PAGE = 10;
async function getGroupThumbnail(groupId) {
    try {
        const data = await rbx(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&size=420x420&format=Png`);
        const t = data.data?.[0];
        return t?.state === "Completed" ? t.imageUrl : null;
    }
    catch {
        return null;
    }
}
export async function buildGroupGamesPage(group, games, statsMap, page) {
    const groupUrl = `https://www.roblox.com/communities/${group.id}`;
    const totalPages = Math.max(1, Math.ceil(games.length / GAMES_PER_PAGE));
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const slice = games.slice(safePage * GAMES_PER_PAGE, safePage * GAMES_PER_PAGE + GAMES_PER_PAGE);
    const lines = slice.map((g, i) => {
        const rank = String(safePage * GAMES_PER_PAGE + i + 1).padStart(2, " ");
        const name = trunc(g.name, 28);
        const stats = statsMap.get(g.id);
        const visits = stats ? ` · ${fmtNum(stats.visits)} visits` : "";
        const placeId = stats?.placeId ? stats.placeId : g.id;
        return `\`${rank}\` [**${name}**](https://www.roblox.com/games/${placeId})${visits}`;
    }).join("\n");
    const components = [
        {
            type: Constants.ComponentTypes.CONTAINER,
            components: [
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `### <:roblox:1477118697402400939> Games by group **[${group.name}](${groupUrl})**`,
                },
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `-# Page ${safePage + 1} of ${totalPages}`,
                },
            ],
        },
        {
            type: Constants.ComponentTypes.CONTAINER,
            components: [
                { type: Constants.ComponentTypes.SEPARATOR },
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: lines,
                },
            ],
        },
    ];
    if (totalPages > 1) {
        components.push({
            type: Constants.ComponentTypes.CONTAINER,
            components: [{
                    type: Constants.ComponentTypes.ACTION_ROW,
                    components: [
                        {
                            type: Constants.ComponentTypes.BUTTON,
                            style: Constants.ButtonStyles.SECONDARY,
                            custom_id: `groupgames_page_${group.id}_${safePage - 1}`,
                            label: "← Previous",
                            disabled: safePage === 0,
                        },
                        {
                            type: Constants.ComponentTypes.BUTTON,
                            style: Constants.ButtonStyles.SECONDARY,
                            custom_id: `groupgames_page_${group.id}_${safePage + 1}`,
                            label: "Next →",
                            disabled: safePage === totalPages - 1,
                        },
                    ],
                }],
        });
    }
    return { components, page: safePage, totalPages };
}
export default {
    name: "group",
    description: "Show a Roblox group's overview or its games",
    category: "<:roblox:1477118697402400939> Roblox",
    options: [
        {
            name: "id",
            description: "Group ID",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
        {
            name: "view",
            description: "What to show (default: overview)",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: false,
            choices: [
                { name: "Overview", value: "overview" },
                { name: "Games", value: "games" },
            ],
        },
    ],
    async function(interaction) {
        const idInput = getOption(interaction, "id").trim();
        const view = getOption(interaction, "view") ?? "overview";
        if (!/^\d+$/.test(idInput)) {
            await MessageHandler.warning(interaction, "Group ID must be a number.");
            return;
        }
        const groupId = parseInt(idInput, 10);
        let group;
        try {
            group = await rbx(`https://groups.roblox.com/v1/groups/${groupId}`);
        }
        catch (err) {
            await MessageHandler.error(interaction, err instanceof RobloxError ? err.message : String(err));
            return;
        }
        const groupUrl = `https://www.roblox.com/communities/${groupId}`;
        const thumb = await getGroupThumbnail(groupId);
        if (view === "overview") {
            const owner = group.owner
                ? `[@${group.owner.username}](https://www.roblox.com/users/${group.owner.userId}/profile)`
                : "None";
            const desc = group.description?.trim()
                ? trunc(group.description.trim().replace(/\n+/g, " "), 200)
                : null;
            const lines = [
                `### <:roblox:1477118697402400939> **[${group.name}](${groupUrl})**`,
                `<:hashtag:1477318314882633758> ID \`${group.id}\`  ·  <:person:1426666445923946668> Owner ${owner}`,
                `<:userinfo:1477363909441617951> **${fmtNum(group.memberCount)}** members`,
                group.publicEntryAllowed ? "<:unlock:1477419213202264105> Public" : "<:lock:1477419211994169547> Private",
                desc ? `\n> ${desc}` : null,
            ].filter(v => v !== null).join("\n");
            const innerComponents = [];
            if (thumb) {
                innerComponents.push({
                    type: Constants.ComponentTypes.SECTION,
                    components: [{ type: Constants.ComponentTypes.TEXT_DISPLAY, content: lines }],
                    accessory: { type: Constants.ComponentTypes.THUMBNAIL, media: { url: thumb } },
                });
            }
            else {
                innerComponents.push({ type: Constants.ComponentTypes.TEXT_DISPLAY, content: lines });
            }
            await MessageHandler.raw(interaction, {
                components: [{ type: Constants.ComponentTypes.CONTAINER, components: innerComponents }],
            });
            return;
        }
        // --- Games view ---
        let games;
        try {
            const data = await rbx(`https://games.roblox.com/v2/groups/${groupId}/games?accessFilter=Public&limit=50&sortOrder=Desc`);
            games = data.data ?? [];
        }
        catch (err) {
            await MessageHandler.error(interaction, err instanceof RobloxError ? err.message : String(err));
            return;
        }
        if (!games.length) {
            await MessageHandler.info(interaction, "No games", `This group has no public games.`);
            return;
        }
        // Fetch play counts + rootPlaceId for all universes in one batched call
        const universeIds = games.map((g) => g.id).join(",");
        const statsMap = new Map();
        try {
            const statsData = await rbx(`https://games.roblox.com/v1/games?universeIds=${universeIds}`);
            for (const s of statsData.data ?? []) {
                statsMap.set(s.id, { visits: s.visits ?? 0, placeId: s.rootPlaceId ?? null });
            }
        }
        catch { /* non-critical */ }
        robloxCache.set(`groupgames:${groupId}`, { group, games, statsMap });
        const { components } = await buildGroupGamesPage(group, games, statsMap, 0);
        await MessageHandler.raw(interaction, { components });
    },
};
