//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
async function fetchTXT(url, errorMessage) {
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(errorMessage);
    return res.text();
}
export default {
    name: "api",
    description: "A scoop of the VoltRadio.me API",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    guildOnly: false,
    visibility: "public",
    category: "<:volt:1426666376197701683> VoltRadio",
    function: async (int) => {
        let data;
        try {
            data = await fetchTXT("https://admin.voltradio.me/api/nowplaying/voltradio", "Couldn't fetch VoltRadio data.");
        }
        catch (e) {
            MessageHandler.error(int, e);
            return;
        }
        await MessageHandler.raw(int, {
            components: [
                {
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: "## <:volt:1426666376197701683> Volt API Scoop"
                        },
                        {
                            type: Constants.ComponentTypes.FILE,
                            file: {
                                url: "attachment://voltapi.json"
                            }
                        }
                    ]
                }
            ],
            attachments: [{
                    filename: "voltapi.json",
                    file: Buffer.from(data)
                }]
        });
    },
};
