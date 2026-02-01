//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { consola } from "consola";
import {
    CommandInteraction,
    ComponentInteraction,
    Constants,
    SelfStatus,
} from "@projectdysnomia/dysnomia";
import { config } from "dotenv";

import app from "./appHandler.js";
import log from "./loggingHandler.js";
import { isOwner } from "./permissions.js";
import { MessageHandler } from "./messageHandler.js";
import { Command } from "./types.js";

config({ override: true, quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let commandCache: Command[] = [];

export async function loadCommands(): Promise<Command[]> {
    if (commandCache.length) return commandCache;

    const cmdsDir = path.resolve(__dirname, "..", "commands");
    const files = await readdir(cmdsDir);

    commandCache = await Promise.all(
        files
            .filter(f => f.endsWith(".js"))
            .map(async file => {
                const mod = await import(
                    pathToFileURL(path.join(cmdsDir, file)).href
                    );
                return (mod.default ?? mod) as Command;
            })
    );

    return commandCache;
}

function setupPresence() {
    if (process.env.APP_ACTIVITY_ENABLED === "false") return;

    const apply = () => {
        const validStatuses: SelfStatus[] = ["online", "idle", "dnd", "invisible"];
        const status = validStatuses.includes(process.env.APP_SHOWAS as SelfStatus)
            ? (process.env.APP_SHOWAS as SelfStatus)
            : "online";

        const activityTypes = {
            playing: 0,
            listening: 2,
            watching: 3,
            competing: 5,
            custom: 4,
            none: undefined,
        } as const;

        const key = (process.env.APP_ACTIVITY_TYPE || "none") as keyof typeof activityTypes;

        app.editStatus(status, {
            name: process.env.APP_ACTIVITY_TEXT ?? "Default status",
            type: activityTypes[key],
            state: key === "custom"
                ? process.env.APP_ACTIVITY_CUSTOM
                : undefined,
        });
    };

    apply();
    setInterval(apply, 60 * 60 * 1000);
}

function deferInteraction(
    interaction: CommandInteraction,
    visibility: "ephemeral" | "public" = "public"
) {
    return visibility === "ephemeral"
        ? interaction.defer(Constants.MessageFlags.EPHEMERAL)
        : interaction.defer();
}

async function handleCommand(interaction: CommandInteraction) {
    const name = interaction.data.name;
    consola.info(`Command received: ${name}`);

    const commands = await loadCommands();
    const command = commands.find(c => c.name === name);

    if (!command) {
        await MessageHandler.warning(interaction, "Unknown command.");
        return;
    }

    await deferInteraction(interaction, command.visibility);

    if (command.guildOnly && !interaction.guild?.id) {
        await MessageHandler.warning(
            interaction,
            "This command can only be used in servers."
        );
        return;
    }

    if (command.ownerOnly && !isOwner(interaction)) {
        await MessageHandler.warning(
            interaction,
            "This command is restricted to the bot owner."
        );
        return;
    }

    try {
        await command.function(interaction);
    } catch (err) {
        consola.error(`${name} failed`, err);
        await MessageHandler.error(interaction, err, `Command: ${name}`);
    }
}

async function handleComponent(interaction: ComponentInteraction) {
    const id = interaction.data.custom_id;
    consola.info(`Component interaction: ${id}`);

    try {
        const file = path.resolve(__dirname, "..", "components", `${id}.js`);
        const mod = await import(pathToFileURL(file).href);
        const handler = mod.default ?? mod;

        if (typeof handler !== "function") {
            throw new Error(`Component "${id}" has no handler`);
        }

        await handler(interaction);
    } catch (err: any) {
        consola.error(`Component ${id} failed`, err);
        await MessageHandler.error(interaction, err, `Component: ${id}`);
    }
}

async function registerCommands() {
    consola.start("Registering Discord commands…");

    const appId = app.user?.id;
    if (!appId) throw new Error("App user not ready");

    const request = app.requestHandler.request.bind(app.requestHandler);

    const local = await loadCommands();

    const formatted = local.map(cmd => ({
        ...cmd,
        integration_types: [0, 1],
        contexts: [0, 1, 2],
    }));

    for (const cmd of formatted) {
        await request("POST", `/applications/${appId}/commands`, true, cmd);
        consola.success(`Upserted: ${cmd.name}`);
    }

    consola.success("Commands synchronized");
}

export default async function start() {
    consola.info("Connecting to Discord…");

    app.once("ready", async () => {
        consola.success("Connected!");
        await registerCommands();
        setupPresence();

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
                            content: `${
                                process.env.APP_PINGROLE === "null" && process.env.APP_PINGUSER === "null"
                                    ? "> No pings selected."
                                    : `> ${
                                        process.env.APP_PINGROLE === "null" ? "" : `<@&${process.env.APP_PINGROLE}> `
                                    }${
                                        process.env.APP_PINGUSER === "null" ? "" : `<@${process.env.APP_PINGUSER}> `
                                    }`
                            }`
                        }
                    ],
                },
            ],
        });

        consola.success("App ready");
    });

    app.on("interactionCreate", async interaction => {
        if (interaction.type === Constants.InteractionTypes.APPLICATION_COMMAND) {
            await handleCommand(interaction);
        } else if (interaction instanceof ComponentInteraction) {
            await handleComponent(interaction);
        }
    });

    process.on("SIGINT", () => {
        consola.warn("Shutting down…");
        app.disconnect({ reconnect: false });
        process.exit(0);
    });

    await app.connect();
}
