//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { consola } from "consola";
import { ComponentInteraction, Constants, } from "@projectdysnomia/dysnomia";
import { config } from "dotenv";
import app from "./appHandler.js";
import log from "./loggingHandler.js";
import { checkPermissions, PERMISSION_MESSAGES } from "./permissions.js";
import { MessageHandler } from "./messageHandler.js";
import { setupPresence, teardownPresence } from "./presence.js";
import { buildPingLine } from "./appConfig.js";
import { loadCommands, reloadCommands, resolveSubcommandHandler, checkCooldown, recordCooldown, buildRegistrationPayload, } from "./commandRegistry.js";
config({ override: true, quiet: true });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function registerCommands() {
    consola.start("[service] Registering Discord commands…");
    const appId = app.user?.id;
    if (!appId)
        throw new Error("app.user is not set — bot not ready yet");
    await reloadCommands();
    const payload = await buildRegistrationPayload();
    await app.requestHandler.request("PUT", `/applications/${appId}/commands`, true, payload);
    consola.success(`[service] Synchronised ${payload.length} commands with Discord.`);
}
function deferInteraction(interaction, visibility = "public") {
    return visibility === "ephemeral"
        ? interaction.defer(Constants.MessageFlags.EPHEMERAL)
        : interaction.defer();
}
async function handleCommand(interaction) {
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
        await MessageHandler.warning(interaction, PERMISSION_MESSAGES[perm.reason], true);
        return;
    }
    const firstOpt = interaction.data.options?.[0];
    const subName = firstOpt?.type === 1 || firstOpt?.type === 2 ? firstOpt.name : undefined;
    let resolvedSub = null;
    if (subName) {
        resolvedSub = await resolveSubcommandHandler(name, subName);
    }
    const effectiveMeta = resolvedSub ? { ...command, ...resolvedSub.meta } : command;
    const visibility = effectiveMeta.visibility ?? "public";
    await deferInteraction(interaction, visibility);
    if (command.cooldown) {
        const userId = interaction.user?.id ?? interaction.member?.id ?? "unknown";
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
            const subPerm = await checkPermissions(interaction, effectiveMeta);
            if (!subPerm.allowed) {
                await MessageHandler.warning(interaction, PERMISSION_MESSAGES[subPerm.reason], true);
                return;
            }
            await resolvedSub.fn(interaction);
        }
        else {
            if (!command.function) {
                await MessageHandler.info(interaction, "No handler", `\`/${name}\` has no function defined.`);
                return;
            }
            await command.function(interaction);
        }
    }
    catch (err) {
        consola.error(`[service] /${name} threw:`, err);
        await MessageHandler.error(interaction, err, `Command: /${name}`);
    }
}
async function handleComponent(interaction) {
    const id = interaction.data.custom_id;
    consola.info(`[service] Component: ${id}`);
    // acknowledge immediately, deferUpdate tells discord we're editing the
    // existing message in-place
    await interaction.deferUpdate();
    // resolve handler file: try exact match first, then strip trailing
    // "_segment" parts to find a prefix handler
    // e.g. "help_page_2" → tries "help_page_2.js", then "help_page_.js"
    const candidates = [id];
    const parts = id.split("_");
    for (let i = parts.length - 1; i > 0; i--) {
        candidates.push(parts.slice(0, i).join("_") + "_");
    }
    let resolvedPath = null;
    for (const candidate of candidates) {
        const p = path.resolve(__dirname, "..", "components", `${candidate}.js`);
        try {
            await import(pathToFileURL(p).href);
            resolvedPath = p;
            break;
        }
        catch {
            // not found
        }
    }
    if (!resolvedPath) {
        consola.warn(`[service] No component handler found for "${id}"`);
        return;
    }
    try {
        const mod = await import(pathToFileURL(resolvedPath).href);
        const handler = mod.default ?? mod;
        if (typeof handler !== "function") {
            throw new Error(`Component handler for "${id}" is not a function`);
        }
        await handler(interaction);
    }
    catch (err) {
        consola.error(`[service] Component "${id}" threw:`, err);
        await MessageHandler.error(interaction, err, `Component: ${id}`);
    }
}
export default async function start() {
    consola.info("[service] Connecting to Discord…");
    app.once("ready", async () => {
        consola.success("[service] Connected!");
        await registerCommands();
        await setupPresence(app);
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
                            content: await buildPingLine(), // global ping target (no guildId)
                        },
                    ],
                },
            ],
        });
        consola.success("[service] App ready.");
    });
    app.on("interactionCreate", async (interaction) => {
        if (interaction.type === Constants.InteractionTypes.APPLICATION_COMMAND) {
            await handleCommand(interaction);
        }
        else if (interaction instanceof ComponentInteraction) {
            await handleComponent(interaction);
        }
    });
    process.on("SIGINT", () => {
        consola.warn("[service] SIGINT received — shutting down cleanly…");
        teardownPresence();
        app.disconnect({ reconnect: false });
        process.exit(0);
    });
    await app.connect();
}
export { reloadCommands };
