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

function ts(ms: number) {
    const s = Math.floor(ms / 1000);
    return `<t:${s}:D> (<t:${s}:R>)`;
}

export default {
    name: "user",
    description: "Show information about a user",
    category: "<:discord:1477119255576314066> Discord",

    options: [
        {
            name: "user",
            description: "User to look up (defaults to you)",
            type: Constants.ApplicationCommandOptionTypes.USER,
            required: false,
        },
    ],

    async function(interaction: CommandInteraction) {
        const userId = getOption<string>(interaction, "user")
            ?? interaction.user?.id
            ?? interaction.member?.id!;

        const user = await app.getRESTUser(userId).catch(() => null);
        if (!user) {
            await MessageHandler.warning(interaction, "Could not find that user.");
            return;
        }

        const member = interaction.guild?.id
            ? await app.getRESTGuildMember(interaction.guild.id, userId).catch(() => null)
            : null;

        let serverAvatarUrl: string | null = null;
        if (interaction.guild!.id) {
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

        const displayUrl = (serverAvatarUrl) ? serverAvatarUrl : globalUrl;

        const globalBannerUrl = (user as any).banner
            ? (() => {
                const b = (user as any).banner as string;
                const ext = b.startsWith("a_") ? "gif" : "png";
                return `https://cdn.discordapp.com/banners/${userId}/${b}.${ext}?size=1024`;
            })()
            : null;

        const memberBannerUrl = (member as any)?.banner
            ? (() => {
                const b = (member as any).banner as string;
                const ext = b.startsWith("a_") ? "gif" : "png";
                return `https://cdn.discordapp.com/guilds/${interaction.guild!.id}/users/${userId}/banners/${b}.${ext}?size=1024`;
            })()
            : null;

        const bannerUrl  = memberBannerUrl ?? globalBannerUrl;
        const bannerLabel = memberBannerUrl ? "server banner" : "global banner";

        const createdAt = Number(BigInt(userId) >> 22n) + 1420070400000;

        const roles = member?.roles?.length
            ? member.roles.slice(0, 8).map((r: string) => `<@&${r}>`).join(" ")
            + (member.roles.length > 8 ? ` +${member.roles.length - 8} more` : "")
            : null;

        const lines = [
            `<:hashtag:1477318314882633758> **ID:** \`${userId}\``,
            `<:callendar:1477359937926594690> **Created:** ${ts(createdAt)}`,
            member?.joinedAt ? `<:callendar:1477359937926594690> **Joined:** ${ts(new Date(member.joinedAt).getTime())}` : null,
            member?.nick ? `<:chat:1477365348641538088> **Nickname** ${member.nick}` : null,
            user.bot ? `<:bot:1477368913581834402> **Bot** yes` : null,
            roles ? `<:paper:1477364621819248793> **Roles** ${roles}` : null,
        ].filter(Boolean).join("\n");

        const innerComponents: any[] = [
            {
                type: Constants.ComponentTypes.SECTION,
                components: [{
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `### <:userinfo:1477363909441617951> **${user.username}**\n${lines}`,
                }, ( serverAvatarUrl ? {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: "-# Displaying **server avatar**."
                } : null )
                ],
                accessory: {
                    type: Constants.ComponentTypes.THUMBNAIL,
                    media: { url: displayUrl },
                },
            },
        ];

        if (bannerUrl) {
            innerComponents.push(
                { type: Constants.ComponentTypes.SEPARATOR },
                {
                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                    content: `-# **${bannerLabel}**`,
                },
                {
                    type: Constants.ComponentTypes.MEDIA_GALLERY,
                    items: [{ media: { url: bannerUrl } }],
                }
            );
        }

        await MessageHandler.raw(interaction, {
            components: [{
                type: Constants.ComponentTypes.CONTAINER,
                components: innerComponents,
            }],
        });
    },
};