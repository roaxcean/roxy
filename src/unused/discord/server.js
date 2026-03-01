//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import app from "../../sys/appHandler.js";
function ts(ms) {
    const s = Math.floor(ms / 1000);
    return `<t:${s}:D> (<t:${s}:R>)`;
}
const VERIFICATION = {
    0: "None", 1: "Low", 2: "Medium", 3: "High", 4: "Very High",
};
export default {
    name: "server",
    description: "Show information about this server",
    category: "<:discord:1477119255576314066> Discord",
    guildOnly: true,
    async function(interaction) {
        if (!interaction.guild?.id) {
            await MessageHandler.warning(interaction, "This command can only be used in a server.");
            return;
        }
        // getRESTGuild with counts=true gives accurate memberCount and proper channel list
        const guild = await app
            .getRESTGuild(interaction.guild.id, true)
            .catch(() => null);
        if (!guild) {
            await MessageHandler.warning(interaction, "Could not fetch server info.");
            return;
        }
        const iconUrl = guild.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith("a_") ? "gif" : "png"}?size=256`
            : null;
        const bannerUrl = guild.banner
            ? `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.${guild.banner.startsWith("a_") ? "gif" : "png"}?size=1024`
            : null;
        const createdAt = Number(BigInt(guild.id) >> 22n) + 1420070400000;
        const memberCount = guild.approximateMemberCount ?? guild.memberCount ?? "?";
        const lines = [
            `<:hashtag:1477318314882633758> **ID:** \`${guild.id}\``,
            `<:hashtag:1477318314882633758> **Owner ID:** \`${guild.ownerID}\``,
            `<:callendar:1477359937926594690> **Created:** ${ts(createdAt)}`,
            `<:userinfo:1477363909441617951> **Members:** ${typeof memberCount === "number" ? memberCount.toLocaleString() : memberCount}`,
            `<:paper:1477364621819248793> **Roles:** ${guild.roles?.size?.toLocaleString() ?? "?"}`,
            `<:sparkles:1477364207593852999> **Boosts:** ${guild.premiumSubscriptionCount ?? 0} (level ${guild.premiumTier})`,
            `<:alert:1467501544294322405> **Verification:** ${VERIFICATION[guild.verificationLevel] ?? guild.verificationLevel}`,
        ].join("\n");
        const innerComponents = [];
        if (iconUrl) {
            innerComponents.push({
                type: Constants.ComponentTypes.SECTION,
                components: [{
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: `### <:comments:1477317873851432990> **${guild.name}**\n${lines}`,
                    }],
                accessory: {
                    type: Constants.ComponentTypes.THUMBNAIL,
                    media: { url: iconUrl },
                },
            });
        }
        else {
            innerComponents.push({
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: `**${guild.name}**\n${lines}`,
            });
        }
        if (guild.description) {
            innerComponents.push({ type: Constants.ComponentTypes.SEPARATOR }, {
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: `-# **Description:**\n> ${guild.description}`,
            });
        }
        // Append server banner if the guild has one
        if (bannerUrl) {
            innerComponents.push({ type: Constants.ComponentTypes.SEPARATOR }, {
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: `-# **Server Banner**`,
            }, {
                type: Constants.ComponentTypes.MEDIA_GALLERY,
                items: [{ media: { url: bannerUrl } }],
            });
        }
        await MessageHandler.raw(interaction, {
            components: [{ type: Constants.ComponentTypes.CONTAINER, components: innerComponents }],
        });
    },
};
