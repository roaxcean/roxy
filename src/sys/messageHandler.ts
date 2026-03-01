//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import {
    AnyInteractionGateway,
    Constants,
    InteractionContent,
    InteractionContentEdit,
} from "@projectdysnomia/dysnomia";

type AnyPayload = Partial<InteractionContent> | Partial<InteractionContentEdit>;

export class MessageHandler {

    private static respond(interaction: AnyInteractionGateway, payload: AnyPayload) {
        if ("editOriginalMessage" in interaction) {
            return (interaction as any).editOriginalMessage(payload);
        }
        return (interaction as any).createMessage(payload);
    }

    private static buildComponents(options: {
        title?: string;
        description?: string;
        fields?: { value: string }[];
    }): any[] {
        const inner: any[] = [];

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

    private static send(
        interaction: AnyInteractionGateway,
        options: {
            title?: string;
            description?: string;
            fields?: { value: string }[];
            ephemeral?: boolean;
        }
    ) {
        const flags =
            Constants.MessageFlags.IS_COMPONENTS_V2 |
            (options.ephemeral ? Constants.MessageFlags.EPHEMERAL : 0);

        return this.respond(interaction, {
            components: this.buildComponents(options),
            flags,
        });
    }

    static error(
        interaction: AnyInteractionGateway,
        error: unknown,
        context?: string,
        ephemeral = false
    ) {
        return this.send(interaction, {
            title: "<:cross:1467501434210877593> Something broke",
            fields: [
                { value: `\`\`\`${error instanceof Error ? error.message : String(error)}\`\`\`` },
                ...(context ? [{ value: context }] : []),
            ],
            ephemeral,
        });
    }

    static info(
        interaction: AnyInteractionGateway,
        title: string,
        description?: string,
        ephemeral = false
    ) {
        return this.send(interaction, {
            title: `<:info:1467501339729727662> ${title}`,
            description,
            ephemeral,
        });
    }

    static success(
        interaction: AnyInteractionGateway,
        description: string,
        ephemeral = false
    ) {
        return this.send(interaction, {
            title: "<:check:1435737072085237930> Done!",
            description,
            ephemeral,
        });
    }

    static warning(
        interaction: AnyInteractionGateway,
        description: string,
        ephemeral = false
    ) {
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
    static cooldown(
        interaction: AnyInteractionGateway,
        remainingMs: number
    ) {
        const secs = (remainingMs / 1000).toFixed(1);
        return this.send(interaction, {
            title: "<:alert:1467501544294322405> Slow down!",
            description: `You can use this command again in **${secs}s**.`,
            ephemeral: true,
        });
    }

    static raw(
        interaction: AnyInteractionGateway,
        payload: AnyPayload
    ) {
        return this.respond(interaction, {
            ...payload,
            flags: Constants.MessageFlags.IS_COMPONENTS_V2,
        });
    }

    static rawUnsafe(
        interaction: AnyInteractionGateway,
        payload: AnyPayload
    ) {
        return this.respond(interaction, payload as any);
    }
}