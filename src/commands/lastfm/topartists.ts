//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { lfm, fmtPlays, trunc, LastfmError } from "./_api.js";
import { resolveUsername, USERNAME_OPTION } from "./_resolve.js";

export const PERIOD_CHOICES = [
    { name: "7 days",    value: "7day"    },
    { name: "1 month",   value: "1month"  },
    { name: "3 months",  value: "3month"  },
    { name: "6 months",  value: "6month"  },
    { name: "12 months", value: "12month" },
    { name: "All time",  value: "overall" },
];

export const PERIOD_OPTION = {
    name: "period",
    description: "Time period (default: 7 days)",
    type: Constants.ApplicationCommandOptionTypes.STRING,
    required: false,
    choices: PERIOD_CHOICES,
};

export const LIMIT_OPTION = {
    name: "limit",
    description: "Number of results (1–10, default 10)",
    type: Constants.ApplicationCommandOptionTypes.INTEGER,
    required: false,
    min_value: 1,
    max_value: 10,
};

export const topartists = {
    name: "topartists",
    description: "Show your top artists on Last.fm",
    category: "<:lastfm:1477120010534256781> Last.fm",
    options: [USERNAME_OPTION, PERIOD_OPTION, LIMIT_OPTION],

    async function(interaction: CommandInteraction) {
        const username = await resolveUsername(interaction);
        if (!username) {
            await MessageHandler.warning(interaction, "No Last.fm username linked. Use `/lastfm set` or pass a `username`.");
            return;
        }

        const userUrl = `https://www.last.fm/user/${username}`;

        const period = getOption<string>(interaction, "period") ?? "7day";
        const limit  = Math.min(Math.max(getOption<number>(interaction, "limit") ?? 10, 1), 10);
        const label  = PERIOD_CHOICES.find(c => c.value === period)?.name ?? period;

        let items: any[];
        try {
            const data = await lfm("user.getTopArtists", { user: username, period, limit: String(limit) });
            items = data.topartists?.artist ?? [];
            if (!Array.isArray(items)) items = [items];
        } catch (err) {
            const msg = err instanceof LastfmError ? err.message : String(err);
            await MessageHandler.error(interaction, msg, `User: [${username}](${userUrl})`);
            return;
        }

        if (!items.length) {
            await MessageHandler.info(interaction, "No data", `No top artists for **[${username}](${userUrl})** in this period.`);
            return;
        }

        // Ranked list matching the .fmbot screenshot style
        const lines = items.map((a: any, i: number) => {
            const rank   = String(i + 1).padStart(2, " ");
            const name   = trunc(a.name, 30);
            const plays  = fmtPlays(a.playcount);
            return `\`${rank}\` **${name}** — *${plays} plays*`;
        }).join("\n");

        await MessageHandler.raw(interaction, {
            components: [{
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: `### <:lastfm:1477120010534256781> **Top artists for [${username}](${userUrl})** (${label})`,
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

export const toptracks = {
    name: "toptracks",
    description: "Show your top tracks on Last.fm",
    category: "<:lastfm:1477120010534256781> Last.fm",
    options: [USERNAME_OPTION, PERIOD_OPTION, LIMIT_OPTION],

    async function(interaction: CommandInteraction) {
        const username = await resolveUsername(interaction);
        if (!username) {
            await MessageHandler.warning(interaction, "No Last.fm username linked. Use `/lastfm set` or pass a `username`.");
            return;
        }

        const userUrl = `https://www.last.fm/user/${username}`;

        const period = getOption<string>(interaction, "period") ?? "7day";
        const limit  = Math.min(Math.max(getOption<number>(interaction, "limit") ?? 10, 1), 10);
        const label  = PERIOD_CHOICES.find(c => c.value === period)?.name ?? period;

        let items: any[];
        try {
            const data = await lfm("user.getTopTracks", { user: username, period, limit: String(limit) });
            items = data.toptracks?.track ?? [];
            if (!Array.isArray(items)) items = [items];
        } catch (err) {
            const msg = err instanceof LastfmError ? err.message : String(err);
            await MessageHandler.error(interaction, msg, `User: [${username}](${userUrl})`);
            return;
        }

        if (!items.length) {
            await MessageHandler.info(interaction, "No data", `No top tracks for **[${username}](${userUrl})** in this period.`);
            return;
        }

        const lines = items.map((t: any, i: number) => {
            const rank   = String(i + 1).padStart(2, " ");
            const title  = trunc(t.name, 28);
            const artist = trunc(t.artist?.name ?? "?", 22);
            const plays  = fmtPlays(t.playcount);
            return `\`${rank}\` **${artist}** — ${title} · *${plays} plays*`;
        }).join("\n");

        await MessageHandler.raw(interaction, {
            components: [{
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: `### <:lastfm:1477120010534256781> **Top tracks for [${username}](${userUrl})** (${label})`,
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

export default topartists;