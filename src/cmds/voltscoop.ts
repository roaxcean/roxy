//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";

async function fetchTXT(url: string, errorMessage: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(errorMessage);
    return res.text();
}

export default {
    name: "voltscoop",
    description: "A scoop of the VoltRadio.lol API",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    guildOnly: false,

    function: async (int: CommandInteraction) => {
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
                file: Buffer.from(
                    await fetchTXT(
                        "https://manage.voltradio.lol/api/nowplaying/voltradio",
                        "Couldn't fetch VoltRadio data."
                    )
                )
            }]
        });
    },
};
