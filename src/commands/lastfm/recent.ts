//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import {lfm, trunc, LastfmError, fmtPlays, lfmImage} from "./_api.js";
import { resolveUsername, USERNAME_OPTION } from "./_resolve.js";

export default {
    name: "recent",
    description: "Show recent scrobbles on Last.fm",
    category: "<:lastfm:1477120010534256781> Last.fm",
    options: [
        USERNAME_OPTION,
        {
            name: "limit",
            description: "Number of tracks to show (1–10, default 10)",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            required: false,
            min_value: 1,
            max_value: 10,
        },
    ],

    async function(interaction: CommandInteraction) {
        const username = await resolveUsername(interaction);
        if (!username) {
            await MessageHandler.warning(
                interaction,
                "No Last.fm username linked. Use `/lastfm set` or pass a `username`."
            );
            return;
        }
        const userUrl = `https://www.last.fm/user/${username}`;

        const limit = Math.min(Math.max(getOption<number>(interaction, "limit") ?? 10, 1), 10);

        let data: any;
        try {
            data = await lfm("user.getRecentTracks", {
                user: username, limit: String(limit + 1), // +1 to absorb the nowplaying phantom
            });
        } catch (err) {
            const msg = err instanceof LastfmError ? err.message : String(err);
            await MessageHandler.error(interaction, msg, `User: ${username}`);
            return;
        }

        let tracks: any[] = data.recenttracks?.track ?? [];
        if (!Array.isArray(tracks)) tracks = [tracks];

        const nowPlayingTrack = tracks.find((t: any) => t["@attr"]?.nowplaying === "true") ?? null;
        const history = tracks
            .filter((t: any) => t["@attr"]?.nowplaying !== "true")
            .slice(0, limit);

        if (!nowPlayingTrack && history.length === 0) {
            await MessageHandler.info(interaction, "No scrobbles yet", `**${username}** hasn't scrobbled anything.`);
            return;
        }

        const lines: string[] = [];

        if (nowPlayingTrack) {
            const title  = trunc(nowPlayingTrack.name ?? "?", 28);
            const artist = trunc(nowPlayingTrack.artist?.["#text"] ?? "?", 22);
            lines.push(`\` ▶\` **${artist}** — ${title}`);
        }

        for (const t of history) {
            const rank   = String(lines.length + 1).padStart(2, " ");
            const title  = trunc(t.name ?? "?", 28);
            const artist = trunc(t.artist?.["#text"] ?? "?", 22);
            const when   = t.date?.uts ? `<t:${t.date.uts}:R>` : "just now";
            lines.push(`\`${rank}\` **${artist}** — ${title} · *${when}*`);
        }

        await MessageHandler.raw(interaction, {
            components: [{
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: `### <:lastfm:1477120010534256781> **Recent tracks for [${username}](${userUrl})**`,
                    },
                    {
                        type: Constants.ComponentTypes.SEPARATOR,
                    },
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: lines.join("\n"),
                    },
                ],
            }],
        });
    },
};