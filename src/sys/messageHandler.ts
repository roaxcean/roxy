// src/sys/messageHandler.ts
import {
    AnyInteractionGateway,
    Constants,
    InteractionContent,
    InteractionContentEdit,
} from "@projectdysnomia/dysnomia";

/**
 * MessageHandler — wraps messages in Discord Components V2 (REST API v10 compatible)
 * Includes “raw send” for fully custom payloads.
 */
export class MessageHandler {
    static async send(
        interaction: AnyInteractionGateway,
        options: InteractionContent | InteractionContentEdit
    ) {
        if ("editOriginalMessage" in interaction) {
            return interaction.editOriginalMessage(options);
        } else {
            // @ts-ignore Dysnomia typings lag behind V2
            return interaction.createMessage(options);
        }
    }

    /** Build a friendly V2 container message */
    private static container({
                                 title,
                                 description,
                                 color,
                                 fields,
                             }: {
        title?: string;
        description?: string;
        color?: number;
        fields?: { name: string; value: string }[];
    }) {
        const components: any[] = [];

        if (title) {
            components.push({
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: title,
            });
        }

        if (description) {
            components.push({
                type: Constants.ComponentTypes.TEXT_DISPLAY,
                content: description,
            });
        }

        if (fields?.length) {
            fields.forEach((f) => {
                components.push({
                    type: Constants.ComponentTypes.SEPARATOR,
                    divider: true,
                    spacing: Constants.SeparatorSpacingSize.SMALL,
                });
                components.push({
                    type: Constants.ComponentTypes.SECTION,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `• ${f.name}: ${f.value}`,
                        },
                    ],
                });
            });
        }

        return [
            {
                type: Constants.ComponentTypes.CONTAINER,
                accent_color: color,
                components,
            },
        ];
    }

    static async error(
        interaction: AnyInteractionGateway,
        error: unknown,
        context?: string
    ) {
        const fields = [
            {
                name: "Details",
                value: `\`\`\`${error instanceof Error ? error.message : String(error)}\`\`\``,
            },
            ...(context ? [{ name: "Context", value: context }] : []),
        ];

        return this.send(interaction, {
            components: this.container({
                title: "❌ Oops!",
                description: "Something went wrong while executing your command.",
                color: 0xff4d4d,
                fields,
            }),
            flags: Constants.MessageFlags.EPHEMERAL | Constants.MessageFlags.IS_COMPONENTS_V2,
        });
    }

    static async info(
        interaction: AnyInteractionGateway,
        title: string,
        description: string
    ) {
        return this.send(interaction, {
            components: this.container({
                title: `ℹ️ ${title}`,
                description,
                color: 0x3498db,
            }),
            flags: Constants.MessageFlags.EPHEMERAL | Constants.MessageFlags.IS_COMPONENTS_V2,
        });
    }

    static async success(interaction: AnyInteractionGateway, description: string) {
        return this.send(interaction, {
            components: this.container({
                title: "✅ All good!",
                description,
                color: 0x2ecc71,
            }),
            flags: Constants.MessageFlags.EPHEMERAL | Constants.MessageFlags.IS_COMPONENTS_V2,
        });
    }

    static async warning(interaction: AnyInteractionGateway, description: string) {
        return this.send(interaction, {
            components: this.container({
                title: "⚠️ Heads up!",
                description,
                color: 0xffcc00,
            }),
            flags: Constants.MessageFlags.EPHEMERAL | Constants.MessageFlags.IS_COMPONENTS_V2,
        });
    }

    /**
     * Sends a fully raw V2 payload, only pre-defines IS_COMPONENTS_V2 flag.
     * Everything else (components, attachments, etc.) is passed as-is.
     */
    static async raw(
        interaction: AnyInteractionGateway,
        payload: Partial<InteractionContent> | Partial<InteractionContentEdit>
    ) {
        return this.send(interaction, {
            ...payload,
            flags: Constants.MessageFlags.IS_COMPONENTS_V2,
        });
    }
}
