//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { lfm, fmtPlays, trunc, LastfmError } from "./_api.js";
import { resolveUsername, USERNAME_OPTION } from "./_resolve.js";
import { PERIOD_CHOICES, PERIOD_OPTION, LIMIT_OPTION } from "./topartists.js";
export default {
    name: "topalbums",
    description: "Show your top albums on Last.fm",
    category: "<:lastfm:1477120010534256781> Last.fm",
    options: [USERNAME_OPTION, PERIOD_OPTION, LIMIT_OPTION],
    async function(interaction) {
        const username = await resolveUsername(interaction);
        if (!username) {
            await MessageHandler.warning(interaction, "No Last.fm username linked. Use `/lastfm set` or pass a `username`.");
            return;
        }
        const userUrl = `https://www.last.fm/user/${username}`;
        const period = getOption(interaction, "period") ?? "7day";
        const limit = Math.min(Math.max(getOption(interaction, "limit") ?? 10, 1), 10);
        const label = PERIOD_CHOICES.find(c => c.value === period)?.name ?? period;
        let items;
        try {
            const data = await lfm("user.getTopAlbums", { user: username, period, limit: String(limit) });
            items = data.topalbums?.album ?? [];
            if (!Array.isArray(items))
                items = [items];
        }
        catch (err) {
            const msg = err instanceof LastfmError ? err.message : String(err);
            await MessageHandler.error(interaction, msg, `User: [${username}](${userUrl})`);
            return;
        }
        if (!items.length) {
            await MessageHandler.info(interaction, "No data", `No top albums for **[${username}](${userUrl})** in this period.`);
            return;
        }
        const lines = items.map((a, i) => {
            const rank = String(i + 1).padStart(2, " ");
            const album = trunc(a.name, 28);
            const artist = trunc(a.artist?.name ?? "?", 22);
            const plays = fmtPlays(a.playcount);
            return `\`${rank}\` **${artist}** — ${album} · *${plays} plays*`;
        }).join("\n");
        await MessageHandler.raw(interaction, {
            components: [{
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `### <:lastfm:1477120010534256781> **Top albums for [${username}](${userUrl})** (${label})`,
                        },
                        {
                            type: Constants.ComponentTypes.SEPARATOR,
                        },
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: lines,
                        },
                    ],
                }],
        });
    },
};
