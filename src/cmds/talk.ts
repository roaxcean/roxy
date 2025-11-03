//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";

export default {
    name: "talk",
    description: "Make roxy say something...",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    guildOnly: false,
    empheral: false,

    options: [
        {
            name: "message",
            description: "What should Roxy say??",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
        {
            name: "plain",
            description: "Wrap it in a pretty embed??????",
            type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
            required: false,
        }
    ],

    function: async (int: CommandInteraction) => {
        const text = int.data.options?.find(opt => opt.name === "message")?.value;
        const plainText = int.data.options?.find(opt => opt.name === "plain")?.value;

        if (!text) {
            await MessageHandler.rawer(int, {
                components: [
                    {
                        type: Constants.ComponentTypes.CONTAINER,
                        components: [
                            {
                                type: Constants.ComponentTypes.TEXT_DISPLAY,
                                content: "### <:forbid:1426995052181192867> You need to specify the `message` option!"
                            }
                        ]
                    }
                ],
                flags: Constants.MessageFlags.IS_COMPONENTS_V2 | Constants.MessageFlags.EPHEMERAL
            });
            return;
        }

        let payload
        if (plainText) {
            payload = {
                content: (text || "meow!") as string,
            }
        } else {
            payload = {
                components: [
                    {
                        type: Constants.ComponentTypes.CONTAINER,
                        components: [
                            {
                                type: Constants.ComponentTypes.TEXT_DISPLAY,
                                content: (text || "meow!") as string,
                            }
                        ]
                    }
                ],
                flags: Constants.MessageFlags.IS_COMPONENTS_V2,
            }
        }

        await MessageHandler.rawer(int, payload)
    },
};