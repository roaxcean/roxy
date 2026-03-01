//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import app from "../../sys/appHandler.js";

export default {
    name: "avatar",
    description: "Show a user's avatar in full size",
    options: [
        {
            name: "user",
            description: "User to look up (defaults to you)",
            type: Constants.ApplicationCommandOptionTypes.USER,
            required: false,
        },
        {
            name: "server",
            description: "Show their server avatar instead of global (if set)",
            type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
            required: false,
        },
    ],
    category: "<:discord:1477119255576314066> Discord",

    async function(interaction: CommandInteraction) {
        const userId    = getOption<string>(interaction, "user") ?? interaction.user?.id ?? interaction.member?.id!;
        const useServer = getOption<boolean>(interaction, "server") ?? false;

        const user = await app.getRESTUser(userId).catch(() => null);
        if (!user) {
            await MessageHandler.warning(interaction, "Could not find that user.");
            return;
        }

        let serverAvatarUrl: string | null = null;
        if (useServer && interaction.guild!.id) {
            const member = await app
                .getRESTGuildMember(interaction.guild!.id, userId)
                .catch(() => null);
            if (member?.avatar) {
                const ext = member.avatar.startsWith("a_") ? "gif" : "png";
                serverAvatarUrl = `https://cdn.discordapp.com/guilds/${interaction.guild!.id}/users/${userId}/avatars/${member.avatar}.${ext}?size=1024`;
            }
        }

        const ext     = user.avatar?.startsWith("a_") ? "gif" : "png";
        const globalUrl = user.avatar
            ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${ext}?size=1024`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || "0") % 5}.png`;

        const displayUrl = (useServer && serverAvatarUrl) ? serverAvatarUrl : globalUrl;
        const label      = useServer && serverAvatarUrl ? "server avatar" : "avatar";

        await MessageHandler.raw(interaction, {
            components: [
                {
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `### <:userinfo:1477363909441617951> ${user.username}'s ${label}`,
                        },
                        {
                            type: Constants.ComponentTypes.MEDIA_GALLERY,
                            items: [{ media: { url: displayUrl } }],
                        },
                        {
                            type: Constants.ComponentTypes.ACTION_ROW,
                            components: [
                                {
                                    type: Constants.ComponentTypes.BUTTON,
                                    style: Constants.ButtonStyles.LINK,
                                    url: displayUrl,
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
                },
            ],
        });
    },
};