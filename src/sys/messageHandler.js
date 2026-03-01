//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants, } from "@projectdysnomia/dysnomia";
export class MessageHandler {
    static respond(interaction, payload) {
        if ("editOriginalMessage" in interaction) {
            return interaction.editOriginalMessage(payload);
        }
        return interaction.createMessage(payload);
    }
    static buildComponents(options) {
        const inner = [];
        if (options.title) {
            inner.push({
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: `## ${options.title}`,
            });
        }
        if (options.description) {
            inner.push({
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: options.description,
            });
        }
        for (const field of options.fields ?? []) {
            inner.push({
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: field.value,
            });
        }
        return [{ type: Constants.ComponentTypes.CONTAINER, components: inner }];
    }
    static send(interaction, options) {
        const flags = Constants.MessageFlags.IS_COMPONENTS_V2 |
            (options.ephemeral ? Constants.MessageFlags.EPHEMERAL : 0);
        return this.respond(interaction, {
            components: this.buildComponents(options),
            flags,
        });
    }
    static error(interaction, error, context, ephemeral = false) {
        return this.send(interaction, {
            title: "<:cross:1467501434210877593> Something broke",
            fields: [
                { value: `\`\`\`${error instanceof Error ? error.message : String(error)}\`\`\`` },
                ...(context ? [{ value: context }] : []),
            ],
            ephemeral,
        });
    }
    static info(interaction, title, description, ephemeral = false) {
        return this.send(interaction, {
            title: `<:info:1467501339729727662> ${title}`,
            description,
            ephemeral,
        });
    }
    static success(interaction, description, ephemeral = false) {
        return this.send(interaction, {
            title: "<:check:1435737072085237930> Done!",
            description,
            ephemeral,
        });
    }
    static warning(interaction, description, ephemeral = false) {
        return this.send(interaction, {
            title: "<:alert:1467501544294322405> Heads up",
            description,
            ephemeral,
        });
    }
    /**
     * Tell the user they're on cooldown.
     * @param interaction
     * @param remainingMs Time left on the cooldown in milliseconds.
     */
    static cooldown(interaction, remainingMs) {
        const secs = (remainingMs / 1000).toFixed(1);
        return this.send(interaction, {
            title: "<:alert:1467501544294322405> Slow down!",
            description: `You can use this command again in **${secs}s**.`,
            ephemeral: true,
        });
    }
    static raw(interaction, payload) {
        return this.respond(interaction, {
            ...payload,
            flags: Constants.MessageFlags.IS_COMPONENTS_V2,
        });
    }
    static rawUnsafe(interaction, payload) {
        return this.respond(interaction, payload);
    }
}
