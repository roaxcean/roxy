//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { lfm, lfmImage, fmtPlays, LastfmError } from "./_api.js";
import { resolveUsername, USERNAME_OPTION } from "./_resolve.js";

export default {
    name: "profile",
    description: "Show a Last.fm user's profile and stats",
    category: "<:lastfm:1477120010534256781> Last.fm",
    options: [USERNAME_OPTION],

    async function(interaction: CommandInteraction) {
        const username = await resolveUsername(interaction);
        if (!username) {
            await MessageHandler.warning(
                interaction,
                "No Last.fm username linked. Use `/lastfm set` or pass a `username`."
            );
            return;
        }

        let user: any;
        try {
            const data = await lfm("user.getInfo", { user: username });
            user = data.user;
        } catch (err) {
            const msg = err instanceof LastfmError ? err.message : String(err);
            await MessageHandler.error(interaction, msg, `User: ${username}`);
            return;
        }

        const avatar    = lfmImage(user.image);
        const scrobbles = fmtPlays(user.playcount);
        const artists   = fmtPlays(user.artist_count ?? "?");
        const albums    = fmtPlays(user.album_count  ?? "?");
        const tracks    = fmtPlays(user.track_count  ?? "?");
        const since     = user.registered?.unixtime
            ? `**<t:${user.registered.unixtime}:D>**`
            : "`Invalid Date`";
        const country   = user.country && user.country !== "None" ? `\nFrom **${user.country}**` : "";
        const url       = user.url ?? `https://www.last.fm/user/${username}`;
        const realname  = user.realname && user.realname !== username ? `${user.realname}` : null;

        const statLines = [
            realname ? `-# **<:person:1426666445923946668> ${realname}**` : null,
            `### <:lastfm:1477120010534256781> **[${username}](${url})**`,
            `Joined ${since}${country}`,
            ``,
            `-# **${scrobbles}** scrobbles`,
            `-# **${artists}** artists · **${albums}** albums · **${tracks}** tracks`,
        ].filter(v => v !== null).join("\n");

        const innerComponents: any[] = [];

        if (avatar) {
            innerComponents.push({
                type: Constants.ComponentTypes.SECTION,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: statLines,
                    },
                ],
                accessory: {
                    type: Constants.ComponentTypes.THUMBNAIL,
                    media: { url: avatar },
                },
            });
        } else {
            innerComponents.push({
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: statLines,
            });
        }

        await MessageHandler.raw(interaction, {
            components: [{ type: Constants.ComponentTypes.CONTAINER, components: innerComponents }],
        });
    },
};