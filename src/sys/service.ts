//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { consola } from "consola";
import {
    CommandInteraction,
    ComponentInteraction,
    Constants,
} from "@projectdysnomia/dysnomia";
import { config } from "dotenv";

import app from "./appHandler.js";
import log from "./loggingHandler.js";
import { checkPermissions, PERMISSION_MESSAGES } from "./permissions.js";
import { MessageHandler } from "./messageHandler.js";
import { setupPresence, teardownPresence } from "./presence.js";
import { buildPingLine } from "./appConfig.js";
import {
    loadCommands,
    reloadCommands,
    resolveSubcommandHandler,
    checkCooldown,
    recordCooldown,
    buildRegistrationPayload,
} from "./commandRegistry.js";
import { Command } from "./types.js";
import { setupGuildEvents } from "./guildEvents.js";

config({ override: true, quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function registerCommands(): Promise<void> {
    consola.start("[service] Registering Discord commands…");

    const appId = app.user?.id;
    if (!appId) throw new Error("app.user is not set — bot not ready yet");

    await reloadCommands();
    const payload = await buildRegistrationPayload();

    await (app.requestHandler.request as Function)(
        "PUT",
        `/applications/${appId}/commands`,
        true,
        payload
    );

    consola.success(`[service] Synchronised ${payload.length} commands with Discord.`);
}

function deferInteraction(interaction: CommandInteraction, visibility: "ephemeral" | "public" = "public") {
    return visibility === "ephemeral"
        ? interaction.defer(Constants.MessageFlags.EPHEMERAL)
        : interaction.defer();
}

async function handleCommand(interaction: CommandInteraction): Promise<void> {
    const name = interaction.data.name;
    const commands = await loadCommands();
    const command = commands.find(c => c.name === name);

    if (!command) {
        await interaction.defer(Constants.MessageFlags.EPHEMERAL);
        await MessageHandler.warning(interaction, "Unknown command.", true);
        return;
    }

    const perm = await checkPermissions(interaction, command);
    if (!perm.allowed) {
        await interaction.defer(Constants.MessageFlags.EPHEMERAL);
        await MessageHandler.warning(interaction, PERMISSION_MESSAGES[perm.reason!], true);
        return;
    }

    const firstOpt = (interaction.data.options as any)?.[0];
    const subName = firstOpt?.type === 1 || firstOpt?.type === 2 ? firstOpt.name : undefined;

    let resolvedSub: Awaited<ReturnType<typeof resolveSubcommandHandler>> = null;
    if (subName) {
        resolvedSub = await resolveSubcommandHandler(name, subName);
    }

    const effectiveMeta = resolvedSub ? { ...command, ...resolvedSub.meta } : command;
    const visibility = effectiveMeta.visibility ?? "public";

    await deferInteraction(interaction, visibility);

    if (command.cooldown) {
        const userId  = interaction.user?.id ?? interaction.member?.id ?? "unknown";
        const guildId = interaction.guild?.id ?? undefined;
        const remaining = checkCooldown(name, command.cooldown, userId, guildId);
        if (remaining > 0) {
            await MessageHandler.cooldown(interaction, remaining);
            return;
        }
        recordCooldown(name, command.cooldown, userId, guildId);
    }

    try {
        if (subName && resolvedSub) {
            const subPerm = await checkPermissions(interaction, effectiveMeta as Command);
            if (!subPerm.allowed) {
                await MessageHandler.warning(interaction, PERMISSION_MESSAGES[subPerm.reason!], true);
                return;
            }

            await (resolvedSub.fn as any)(interaction);
        } else {
            if (!command.function) {
                await MessageHandler.info(interaction, "No handler",
                    `\`/${name}\` has no function defined.`);
                return;
            }
            await (command.function as any)(interaction);
        }
    } catch (err) {
        consola.error(`[service] /${name} threw:`, err);
        await MessageHandler.error(interaction, err, `Command: /${name}`);
    }
}

async function handleComponent(interaction: ComponentInteraction): Promise<void> {
    const id = interaction.data.custom_id;
    consola.info(`[service] Component: ${id}`);

    // acknowledge immediately, deferUpdate tells discord we're editing the
    // existing message in-place
    await (interaction as any).deferUpdate();

    // resolve handler file: try exact match first, then strip trailing
    // "_segment" parts to find a prefix handler
    // e.g. "help_page_2" → tries "help_page_2.js", then "help_page_.js"
    const candidates: string[] = [id];
    const parts = id.split("_");
    for (let i = parts.length - 1; i > 0; i--) {
        candidates.push(parts.slice(0, i).join("_") + "_");
    }

    let handler: unknown;
    for (const candidate of candidates) {
        const p = path.resolve(__dirname, "..", "components", `${candidate}.js`);
        try {
            const mod = await import(pathToFileURL(p).href);
            handler = mod.default ?? mod;
            break;
        } catch {
            // file not found
        }
    }

    if (!handler) {
        consola.warn(`[service] No component handler found for "${id}"`);
        return;
    }

    if (typeof handler !== "function") {
        consola.error(`[service] Component handler for "${id}" is not a function`);
        return;
    }

    try {
        await handler(interaction);
    } catch (err: any) {
        consola.error(`[service] Component "${id}" threw:`, err);
        await MessageHandler.error(interaction, err, `Component: ${id}`);
    }
}

function connectWithTimeout(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(
                `Connection timed out after ${timeoutMs / 1000}s — Discord gateway did not respond.`
            ));
        }, timeoutMs);

        app.connect().then(() => {
            clearTimeout(timer);
            resolve();
        }).catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

export default async function start(): Promise<void> {
    consola.info("[service] Connecting to Discord…");

    app.once("ready", async () => {
        consola.success("[service] Connected!");

        await registerCommands();
        await setupPresence(app);
        setupGuildEvents(app);

        await log({
            components: [
                {
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `### <:settings:1426875133385244703> ${app.user.username}#${app.user.discriminator} process started!`,
                        },
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: await buildPingLine(),
                        },
                    ],
                },
            ],
        });

        consola.success("[service] App ready.");
    });

    app.on("interactionCreate", async interaction => {
        if (interaction.type === Constants.InteractionTypes.APPLICATION_COMMAND) {
            await handleCommand(interaction as CommandInteraction);
        } else if (interaction instanceof ComponentInteraction) {
            await handleComponent(interaction);
        }
    });

    process.on("SIGINT", () => {
        consola.warn("[service] SIGINT received — shutting down cleanly…");
        teardownPresence();
        app.disconnect({ reconnect: false });
        process.exit(0);
    });

    try {
        await connectWithTimeout(30_000);
    } catch (err) {
        consola.error("[service] Failed to connect to Discord:", err);
        process.exit(1);
    }
}

export { reloadCommands };