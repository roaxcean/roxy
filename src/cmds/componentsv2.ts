//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import {CommandInteraction, Constants} from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";

/**
 * @type { Command }
 */
export default {
    name: "compv2",
    description: "a cute lil demo of components v2",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    guildOnly: false,
    function: async (int: CommandInteraction ) => {
        await MessageHandler.raw(int, {
            components: [
                // A text display component displays text
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: "# Welcome to Components v2!"
                },
                // A container component groups components together in a box, similar to an embed
                {
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: "A container groups content together, similar to an embed. It can have an accent color and various components included in it. You can find some files and images below."
                        },
                        // A media gallery components displays a bunch of media items (images, videos, etc.) in a grid
                        {
                            type: Constants.ComponentTypes.MEDIA_GALLERY,
                            items: [
                                {
                                    media: {
                                        url: int.user?.avatarURL ?? "https://dev.roax.world/i/aeryn/profile" // The URL of the media item. attachment:// URLs can also be used
                                    },
                                    description: `${int.user?.username ?? "aeryxvs"}'s avatar` // A media gallery item can have alt text attached to it
                                }
                            ]
                        },
                        // A separator component creates a horizontal line in the message
                        {
                            type: Constants.ComponentTypes.SEPARATOR,
                            divider: true,
                            spacing: Constants.SeparatorSpacingSize.LARGE
                        },
                        // A section component displays text content with an optional accessory
                        {
                            type: Constants.ComponentTypes.SECTION,
                            components: [
                                {
                                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                                    content: "Above is a divider with large spacing, and your avatar is to the right of this text. v1 components are still supported in v2 messages. For example, here's an user select component:"
                                }
                            ],
                            accessory: { // A thumbnail accessory displays an image to the right of the section
                                type: Constants.ComponentTypes.THUMBNAIL,
                                media: {
                                    url: int.user?.avatarURL ?? "https://dev.roax.world/i/aeryn/profile"
                                }
                            }
                        },
                        // An action row (v1 component)
                        {
                            type: Constants.ComponentTypes.ACTION_ROW,
                            components: [
                                // A user select component allows the user to select a user
                                {
                                    type: Constants.ComponentTypes.USER_SELECT,
                                    custom_id: "user_select",
                                    placeholder: "Select a user"
                                }
                            ]
                        }
                    ]
                },
                // A file component displays a file attachment
                {
                    type: Constants.ComponentTypes.FILE,
                    file: {
                        url: "attachment://hello_world.txt"
                    },
                    spoiler: true
                },
                {
                    type: Constants.ComponentTypes.SECTION,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: "A section can have a button displayed next to it."
                        }
                    ],
                    accessory: {
                        type: Constants.ComponentTypes.BUTTON,
                        style: Constants.ButtonStyles.PRIMARY,
                        custom_id: "click_me",
                        label: "Click me!"
                    }
                }
            ],
            attachments: [{
                filename: "hello_world.txt",
                file: Buffer.from("Hello, world!")
            }]
        })
    }
}