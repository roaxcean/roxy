//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";

export default {
    name: "help",
    description: "helps u with finding commands, i guess",
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
                            content: "## <:question:1426873669992321056> Roxy Help"
                        }
                    ]
                },
                {
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `### <:volt:1426666376197701683> **VoltRadio.lol Commands**
                            > **\`/volt\`**: Quickly check what's cooking on the radio!
                            > **\`/voltdata\`**: A more extended version, more data to look at.
                            > **\`/voltscoop\`**: A quick scoop of the public API, converted to a JSON file for you.`
                        }
                    ]
                },
                {
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `### <:settings:1426875133385244703> **Roxy Commands**
                            > **\`/help\`**: Show this embed.
                            > **\`/talk\`**: Make Roxy say something.`
                        }
                    ]
                }
            ],
        });
    },
};
