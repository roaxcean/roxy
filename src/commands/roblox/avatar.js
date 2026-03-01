//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { resolveUser, getAvatarUrl, RobloxError } from "./_api.js";
const TYPE_MAP = {
    full: { type: "AvatarThumbnail", size: "720x720", label: "Full avatar" },
    bust: { type: "AvatarBust", size: "420x420", label: "Bust" },
    profile: { type: "AvatarHeadShot", size: "420x420", label: "Profile / headshot" },
};
export default {
    name: "avatar",
    description: "Show a Roblox user's avatar (full, bust, or headshot)",
    category: "<:roblox:1477118697402400939> Roblox",
    options: [
        {
            name: "user",
            description: "Roblox username or user ID",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
        {
            name: "type",
            description: "Avatar type (default: full)",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: false,
            choices: [
                { name: "Full body", value: "full" },
                { name: "Bust", value: "bust" },
                { name: "Headshot", value: "profile" },
            ],
        },
    ],
    async function(interaction) {
        const input = getOption(interaction, "user");
        const typeKey = getOption(interaction, "type") ?? "full";
        const typeInfo = TYPE_MAP[typeKey] ?? TYPE_MAP.full;
        let user;
        try {
            user = await resolveUser(input);
        }
        catch (err) {
            await MessageHandler.error(interaction, err instanceof RobloxError ? err.message : String(err));
            return;
        }
        const url = await getAvatarUrl(user.id, typeInfo.type, typeInfo.size);
        if (!url) {
            await MessageHandler.warning(interaction, `Could not load avatar for [**${user.name}**](https://www.roblox.com/users/profile?username=${user.name}).`);
            return;
        }
        await MessageHandler.raw(interaction, {
            components: [{
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `-# <:roblox:1477118697402400939> [**${user.displayName}** (@${user.name})](https://www.roblox.com/users/profile?username=${user.name}) — ${typeInfo.label}`,
                        },
                        {
                            type: Constants.ComponentTypes.MEDIA_GALLERY,
                            items: [{ media: { url } }],
                        },
                        {
                            type: Constants.ComponentTypes.ACTION_ROW,
                            components: [
                                {
                                    type: Constants.ComponentTypes.BUTTON,
                                    style: Constants.ButtonStyles.LINK,
                                    url: url,
                                    label: "Open full size",
                                    emoji: {
                                        name: "link",
                                        id: "1426855509780332555",
                                        animated: false,
                                    }
                                }
                            ],
                        },
                    ],
                }],
        });
    },
};
