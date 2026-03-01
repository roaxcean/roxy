//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
async function fetchJSON(url, errorMessage) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(errorMessage);
    return res.json();
}
export default {
    name: "fm",
    description: "What's cooking at VoltRadio.me",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    guildOnly: false,
    visibility: "public",
    category: "<:volt:1426666376197701683> VoltRadio",
    function: async (int) => {
        let data;
        try {
            data = await fetchJSON("https://admin.voltradio.me/api/nowplaying/voltradio", "Couldn't fetch VoltRadio data.");
        }
        catch (e) {
            MessageHandler.error(int, e);
            return;
        }
        const thumbnail = `https://api.synkradio.co.uk/spotify/cover?format=webp&width=576&height=576&artist=${data.now_playing.song.artist.split(";")[0].replaceAll(" ", "%20")}&title=${data.now_playing.song.title.replaceAll(" ", "%20")}`;
        const artist = data.now_playing.song.artist.includes(";")
            ? data.now_playing.song.artist.replaceAll(";", ",")
            : data.now_playing.song.artist;
        const components = [
            {
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: "### <:volt:1426666376197701683> Now Playing on Volt!",
                    },
                ],
            },
            {
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.SECTION,
                        components: [
                            {
                                type: Constants.ComponentTypes.TEXT_DISPLAY,
                                content: `## <:music:1426686930296373289> ${data.now_playing.song.title}`,
                            },
                            {
                                type: Constants.ComponentTypes.TEXT_DISPLAY,
                                content: `By ${artist}`,
                            },
                        ],
                        accessory: {
                            type: Constants.ComponentTypes.THUMBNAIL,
                            media: { url: thumbnail || "https://voltradio.me/voltradio-icon.png" },
                        },
                    },
                    {
                        type: Constants.ComponentTypes.SEPARATOR,
                        divider: true,
                        spacing: Constants.SeparatorSpacingSize.LARGE,
                    },
                    {
                        type: Constants.ComponentTypes.ACTION_ROW,
                        components: [
                            {
                                type: Constants.ComponentTypes.BUTTON,
                                style: Constants.ButtonStyles.SECONDARY,
                                custom_id: "volt_listeners",
                                disabled: true,
                                emoji: { name: "person", id: "1426666445923946668" },
                                label: `Listeners: ${data.listeners.total}`,
                            },
                            {
                                type: Constants.ComponentTypes.BUTTON,
                                style: Constants.ButtonStyles.LINK,
                                emoji: { name: "link", id: "1426855509780332555" },
                                url: "https://voltradio.me/",
                                label: "voltradio.me",
                            },
                            {
                                type: Constants.ComponentTypes.BUTTON,
                                style: Constants.ButtonStyles.LINK,
                                emoji: { name: "volt", id: "1426666376197701683" },
                                url: "https://discord.gg/VrZpjVfGps",
                                label: "Server",
                            },
                        ],
                    },
                ],
            },
        ];
        if (data.live.is_live) {
            components.push({
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: `### <:mic:1426677132578390137> **${data.live.streamer_name}** is live now!`,
                    },
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: data.live.broadcast_start
                            ? `Started <t:${Math.floor(data.live.broadcast_start)}:R>`
                            : "Live session ongoing.",
                    },
                ],
            });
        }
        await MessageHandler.raw(int, { components });
    },
};
