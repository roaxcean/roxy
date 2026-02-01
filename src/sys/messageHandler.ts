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

export class MessageHandler {
    private static respond(
        interaction: AnyInteractionGateway,
        payload: InteractionContent | InteractionContentEdit
    ) {
        if ("editOriginalMessage" in interaction) {
            return interaction.editOriginalMessage(payload);
        }

        // @ts-expect-error dysnomia typing is...weird
        return interaction.createMessage(payload);
    }

    private static container(options: {
        title?: string;
        description?: string;
        fields?: { value: string }[];
    }) {
        const components: any[] = [];

        if (options.title) {
            components.push({
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: "## "+options.title,
            });
        }

        if (options.description) {
            components.push({
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: options.description,
            });
        }

        if (options.fields?.length) {
            for (const field of options.fields) {
                components.push(
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: `${field.value}`,
                    },
                );
            }
        }

        return [
            {
                type: Constants.ComponentTypes.CONTAINER,
                components,
            },
        ];
    }

    private static send(
        interaction: AnyInteractionGateway,
        options: {
            title?: string;
            description?: string;
            fields?: { value: string }[];
            forceEphemeral?: boolean;
        }
    ) {
        return this.respond(interaction, {
            components: this.container({
                title: options.title,
                description: options.description,
                fields: options.fields,
            }),
            flags:
                Constants.MessageFlags.IS_COMPONENTS_V2 |
                (options.forceEphemeral
                    ? Constants.MessageFlags.EPHEMERAL
                    : 0),
        });
    }

    static error(
        interaction: AnyInteractionGateway,
        error: unknown,
        context?: string
    ) {
        return this.send(interaction, {
            title: "<:cross:1467501434210877593> Something broke",
            fields: [
                {
                    value: `\`\`\`${error instanceof Error ? error.message : String(error)}\`\`\``,
                },
                ...(context ? [{ value: context }] : []),
            ],
        });
    }

    static info(
        interaction: AnyInteractionGateway,
        title: string,
        description?: string
    ) {
        return this.send(interaction, {
            title: `<:info:1467501339729727662> ${title}`,
            description,
        });
    }

    static success(
        interaction: AnyInteractionGateway,
        description: string
    ) {
        return this.send(interaction, {
            title: "<:check:1435737072085237930> Done!",
            description,
        });
    }

    static warning(
        interaction: AnyInteractionGateway,
        description: string
    ) {
        return this.send(interaction, {
            title: "<:alert:1467501544294322405> Heads up",
            description,
        });
    }

    static raw(
        interaction: AnyInteractionGateway,
        payload: Partial<InteractionContent | InteractionContentEdit>
    ) {
        return this.respond(interaction, {
            ...payload,
            flags: Constants.MessageFlags.IS_COMPONENTS_V2,
        });
    }

    static rawUnsafe(
        interaction: AnyInteractionGateway,
        payload: Partial<InteractionContent | InteractionContentEdit>
    ) {
        return this.respond(interaction, payload as any);
    }
}
