//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";
import { StationResponse } from "../sys/types.js";

async function fetchJSON<T>(url: string, errMsg: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(errMsg);
    return res.json();
}

export default {
    name: "voltdata",
    description: "What's cooking at VoltRadio.lol (more)",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    guildOnly: false,
    empheral: false,

    function: async (int: CommandInteraction) => {
        const data = await fetchJSON<StationResponse>(
            "https://manage.voltradio.lol/api/nowplaying/voltradio",
            "Couldn't fetch VoltRadio data."
        );

        const thumbnail = `https://api.synkradio.co.uk/spotify/cover?format=webp&width=576&height=576&artist=${
            data.now_playing.song.artist.split(";")[0].replaceAll(" ", "%20")
        }&title=${
            data.now_playing.song.title.replaceAll(" ", "%20")
        }`;

        const nexthumbnail = `https://api.synkradio.co.uk/spotify/cover?format=webp&width=576&height=576&artist=${
            data.playing_next.song.artist.split(";")[0].replaceAll(" ", "%20")
        }&title=${
            data.playing_next.song.title.replaceAll(" ", "%20")
        }`;

        const components: any[] = [
            {
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: "### <:volt:1426666376197701683> VoltRadio — Live Data",
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
                                content: `By ${data.now_playing.song.artist.replaceAll(";", ",")}`,
                            },
                        ],
                        accessory: {
                            type: Constants.ComponentTypes.THUMBNAIL,
                            media: {
                                url: thumbnail || "https://voltradio.lol/icon-192.webp",
                            }
                        },
                    },
                ],
            },

            {
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    { type: Constants.ComponentTypes.TEXT_DISPLAY, content: "### <:person:1426666445923946668> Listener Stats" },
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: `> Total: **${data.listeners.total}**  
> Unique: **${data.listeners.unique}**  
> Current: **${data.listeners.current}**`,
                    },
                ],
            },

            {
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    { type: Constants.ComponentTypes.TEXT_DISPLAY, content: "### <:rss:1426686462723621026> Station Info" },
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: `> **${data.station.name}**  
> Backend: ${data.station.backend}  
> Frontend: ${data.station.frontend}  
> Timezone: ${data.station.timezone}  
> Public: ${data.station.is_public ? "Yes" : "No"}`,
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
                        content: `### <:mic:1426677132578390137> ${data.live.streamer_name} is Live!`,
                    },
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: data.live.broadcast_start
                            ? `Started <t:${Math.floor(data.live.broadcast_start)}:R>`
                            : "Live broadcast ongoing.",
                    },
                ],
            });
        } else {
            components.push({
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.SECTION,
                        components: [
                            { type: Constants.ComponentTypes.TEXT_DISPLAY, content: "### <:arrowr:1426686528276529313> Next Track" },
                            {
                                type: Constants.ComponentTypes.TEXT_DISPLAY,
                                content: `**${data.playing_next.song.title}**  
By ${data.playing_next.song.artist}`,
                            },
                        ],
                        accessory: {
                            type: Constants.ComponentTypes.THUMBNAIL,
                            media: {
                                url: nexthumbnail || "https://manage.voltradio.lol/icon-192.webp",
                            }
                        }
                    }
                ],
            })
        }

        components.push({
            type: Constants.ComponentTypes.CONTAINER,
            components: [
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
            ]
        })

        await MessageHandler.raw(int, { components });
    },
};
