//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { rbx, fmtNum, fmtDate, trunc, RobloxError } from "./_api.js";
async function resolveUniverseId(input) {
    // If it's already a universe ID (long number), use directly.
    // Roblox place IDs and universe IDs are both numeric — we try universe first,
    // then fall back to the place→universe lookup.
    if (!/^\d+$/.test(input.trim())) {
        throw new RobloxError("Game ID must be a numeric place ID or universe ID.");
    }
    const id = parseInt(input.trim(), 10);
    // Try treating it as a universe ID first
    try {
        const data = await rbx(`https://games.roblox.com/v1/games?universeIds=${id}`);
        if (data.data?.length)
            return id;
    }
    catch { /* empty */ }
    // Fall back: treat as place ID, resolve to universe
    const universeData = await rbx(`https://apis.roblox.com/universes/v1/places/${id}/universe`);
    return universeData.universeId;
}
async function getGameThumbnail(universeId) {
    try {
        const data = await rbx(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`);
        const t = data.data?.[0];
        return t?.state === "Completed" ? t.imageUrl : null;
    }
    catch {
        return null;
    }
}
export default {
    name: "game",
    description: "Show stats and info for a Roblox game",
    category: "<:roblox:1477118697402400939> Roblox",
    options: [
        {
            name: "id",
            description: "Place ID or Universe ID (found in the game URL)",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
    ],
    async function(interaction) {
        const input = getOption(interaction, "id");
        let universeId;
        try {
            universeId = await resolveUniverseId(input);
        }
        catch (err) {
            await MessageHandler.error(interaction, err instanceof RobloxError ? err.message : String(err));
            return;
        }
        let game;
        try {
            const data = await rbx(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
            game = data.data?.[0];
            if (!game)
                throw new RobloxError("Game not found.");
        }
        catch (err) {
            await MessageHandler.error(interaction, err instanceof RobloxError ? err.message : String(err));
            return;
        }
        const thumb = await getGameThumbnail(universeId);
        const desc = game.description?.trim()
            ? trunc(game.description.trim().replace(/\n+/g, " "), 200)
            : null;
        const gameUrl = `https://www.roblox.com/games/${game.rootPlaceId}`;
        const rating = (game.totalUpVotes + game.totalDownVotes) > 0
            ? `${Math.round(game.totalUpVotes / (game.totalUpVotes + game.totalDownVotes) * 100)}%`
            : "N/A";
        const lines = [
            `### <:roblox:1477118697402400939> **[${game.name}](${gameUrl})**`,
            `-# by **${game.creator?.name ?? "Unknown"}**`,
            ``,
            `<:play:1477311260084404275> **${fmtNum(game.visits)}** visits  ·  <:person:1426666445923946668> **${fmtNum(game.playing)}** playing now`,
            `<:heart:1477311402749333514> **${fmtNum(game.favoritedCount)}** favourited  ·  <:thumbsup:1477414836630458522> **${rating}** rating`,
            `<:comments:1477317873851432990> Max players **${game.maxPlayers}**  ·  <:callendar:1477359937926594690> Created ${fmtDate(game.created)}`,
            game.genre ? `<:box:1477309442751074437> Genre **${game.genre}**` : null,
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
    },
};
