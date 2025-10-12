// ./../customs/user_select.ts
import {ComponentInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";

/**
 * This handles the "user_select" component.
 * Dysnomia's ComponentInteraction supports followUp() after defer()
 */
export default async function (int: ComponentInteraction) {
    await MessageHandler.raw(int, {
        components: [
            {
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.SECTION,
                        components: [
                            {
                                type: Constants.ComponentTypes.TEXT_DISPLAY,
                                content: "Above is a divider with large spacing, and your avatar is to the right of this text. v1 components are still supported in v2 messages. For example, here's an user select component:"
                            }
                        ],
                        accessory: {
                            type: Constants.ComponentTypes.THUMBNAIL,
                            media: {
                                url: int.user?.avatarURL ?? "https://dev.roax.world/i/aeryn/profile"
                            }
                        }
                    },
                ]
            }
        ]
    });

    return;
}
