//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";
import { StationResponse } from "../sys/types.js";

async function fetchJSON<T>(url: string, errorMessage: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(errorMessage);
    return res.json();
}

export default {
    name: "volt",
    description: "What's cooking at VoltRadio.lol",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    guildOnly: false,
    visibility: "public",

    category: "VoltRadio",

    function: async (int: CommandInteraction) => {
        let data: StationResponse

        try {
            data = await fetchJSON<StationResponse>(
                "https://manage.voltradio.lol/api/nowplaying/voltradio",
                "Couldn't fetch VoltRadio data."
            );
        } catch (e: any | Error) {
            MessageHandler.error(int, e);
            return;
        }

        console.log(data);

        const thumbnail = `https://api.synkradio.co.uk/spotify/cover?format=webp&width=576&height=576&artist=${
            data.now_playing.song.artist.split(";")[0].replaceAll(" ", "%20")
        }&title=${
            data.now_playing.song.title.replaceAll(" ", "%20")
        }`;

        const artist = data.now_playing.song.artist.includes(";")
            ? data.now_playing.song.artist.replaceAll(";", ",")
            : data.now_playing.song.artist;

        const components: any[] = [
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
                            media: { url: thumbnail || "https://voltradio.lol/icon-192.webp" },
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
                                url: "https://voltradio.lol/",
                                label: "voltradio.lol",
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
