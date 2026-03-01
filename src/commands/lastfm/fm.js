//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { lfm, lfmImage, fmtPlays, LastfmError } from "./_api.js";
import { resolveUsername, USERNAME_OPTION } from "./_resolve.js";
export default {
    name: "fm",
    description: "Show what's currently (or last) playing on Last.fm",
    category: "<:lastfm:1477120010534256781> Last.fm",
    options: [USERNAME_OPTION],
    async function(interaction) {
        const username = await resolveUsername(interaction);
        if (!username) {
            await MessageHandler.warning(interaction, "No Last.fm username linked. Use `/lastfm set` or pass a `username`.");
            return;
        }
        // Fetch recent track + user info in parallel
        let recentData, userData;
        try {
            [recentData, userData] = await Promise.all([
                lfm("user.getRecentTracks", { user: username, limit: "1", extended: "1" }),
                lfm("user.getInfo", { user: username }),
            ]);
        }
        catch (err) {
            const msg = err instanceof LastfmError ? err.message : String(err);
            await MessageHandler.error(interaction, msg, `User: ${username}`);
            return;
        }
        const tracks = recentData.recenttracks?.track;
        if (!tracks?.length) {
            await MessageHandler.info(interaction, "Nothing scrobbled yet", `**${username}** has no scrobbles.`);
            return;
        }
        const track = Array.isArray(tracks) ? tracks[0] : tracks;
        const nowPlaying = track["@attr"]?.nowplaying === "true";
        const title = track.name ?? "Unknown";
        const artist = track.artist?.name ?? track.artist?.["#text"] ?? "Unknown";
        const album = track.album?.["#text"] ?? null;
        const loved = track.loved === "1";
        const artwork = lfmImage(track.image);
        const trackUrl = track.url ?? `https://www.last.fm/user/${username}`;
        const user = userData.user;
        const totalScrobbles = fmtPlays(user?.playcount ?? 0);
        const userUrl = user?.url ?? `https://www.last.fm/user/${username}`;
        // ── Compact horizontal layout ─────────────────────────────────────────
        // Left column: track info. Right column: artwork thumbnail via section.
        // Discord's section component puts an accessory (image) to the right of text.
        const statusIcon = nowPlaying ? "<:play:1477311260084404275>" : "<:pause:1477311258914193572>";
        const lovedStr = loved ? " <:heart:1477311402749333514>" : "";
        const trackInfo = [
            `### ${statusIcon} **[${title}](${trackUrl})**${lovedStr}`,
            `**${artist}**${album ? ` · *${album}*` : ""}`,
            ``,
            `-# <:lastfm:1477120010534256781> · [${username}](${userUrl}) · ${totalScrobbles} scrobbles`,
        ].join("\n");
        // Use a section with thumbnail accessory for the horizontal layout
        const innerComponents = [];
        if (artwork) {
            innerComponents.push({
                type: Constants.ComponentTypes.SECTION,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: trackInfo,
                    },
                ],
                accessory: {
                    type: Constants.ComponentTypes.THUMBNAIL,
                    media: { url: artwork },
                },
            });
        }
        else {
            innerComponents.push({
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: trackInfo,
            });
        }
        await MessageHandler.raw(interaction, {
            components: [{ type: Constants.ComponentTypes.CONTAINER, components: innerComponents }],
        });
    },
};
