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
import { setTimeout as wait } from "node:timers/promises";
import {AnyInteractionGateway, ComponentInteraction, Constants, SelfStatus} from "@projectdysnomia/dysnomia";
import { config } from "dotenv";
config({ override: true, quiet: true });

import app from "./appHandler.js";
import log from "./loggingHandler.js"
import { Command } from "./types.js";
import { MessageHandler } from "./messageHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadCommands(): Promise<Command[]> {
    const cmdsDir = path.resolve(__dirname, "..", "cmds");
    const files = await readdir(cmdsDir);

    const commands: Command[] = [];

    for (const file of files) {
        if (!file.endsWith(".js")) continue;

        const cmdModule = await import(pathToFileURL(path.join(cmdsDir, file)).href);
        const cmd = cmdModule.default ?? cmdModule;

        commands.push(cmd as Command);
    }

    return commands;
}

function setActivity() {
    if (process.env.APP_ACTIVITY_ENABLED === "false") return;

    const apply = () => {
        const validStatuses: SelfStatus[] = ["online", "idle", "dnd", "invisible"];
        const status: SelfStatus = validStatuses.includes(process.env.APP_SHOWAS as SelfStatus)
            ? (process.env.APP_SHOWAS as SelfStatus)
            : "online";

        const activities = {
            playing: 0,
            watching: 3,
            listening: 2,
            competing: 5,
            custom: 4,
            none: undefined
        } as const;

        const typeKey = (process.env.APP_ACTIVITY_TYPE || "none") as keyof typeof activities;
        const activityType = activities[typeKey];

        app.editStatus(status, {
            name: process.env.APP_ACTIVITY_TEXT ?? "Default status",
            type: activityType,
            state: typeKey === "custom" ? process.env.APP_ACTIVITY_CUSTOM : undefined,
        });
    };

    apply();
    setInterval(apply, 60 * 60 * 1000);
}

async function safeRequest(requestHandler: any, method: string, endpoint: string, auth: boolean, body?: any, retries = 3) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await requestHandler.request(method, endpoint, auth, body);
        } catch (err: any) {
            attempt++;
            const status = err?.status || err?.code;

            if (status === 429) {
                const retryAfter = err.response?.headers?.get("Retry-After") || 2;
                consola.warn(`Rate-limited. Retrying after ${retryAfter}s...`);
                await wait(Number(retryAfter) * 1000);
            } else if (attempt < retries) {
                const delay = 500 * attempt;
                consola.warn(`Retrying ${method} ${endpoint} (attempt ${attempt}/${retries}) in ${delay}ms...`);
                await wait(delay);
            } else {
                consola.error(`Request failed after ${retries} attempts:`, err);
                throw err;
            }
        }
    }
}

async function registerCommands() {
    consola.start("Registering Discord commands...");

    try {
        const appId = app.user?.id;
        if (!appId) throw new Error("App user is not initialized. Make sure the bot is connected.");

        const existingCommands: any[] = await safeRequest(app.requestHandler, "GET", `/applications/${appId}/commands`, true);
        const localCommands: Command[] = await loadCommands();
        const formattedCommands = localCommands.map(cmd => ({
            ...cmd,
            integration_types: [0, 1],
            contexts: [0, 1, 2],
        }));

        const toCreateOrUpdate = formattedCommands.filter(localCmd => {
            const existing = existingCommands.find(c => c.name === localCmd.name && c.type === localCmd.type);
            return !existing || JSON.stringify(existing) !== JSON.stringify(localCmd);
        });

        const toDelete = existingCommands.filter(c => !formattedCommands.some(l => l.name === c.name && l.type === c.type));

        for (const cmd of toCreateOrUpdate) {
            try {
                await safeRequest(app.requestHandler, "POST", `/applications/${appId}/commands`, true, cmd);
                consola.success(`Upserted: ${cmd.name}`);
            } catch (err) {
                consola.error(`Failed to upsert command '${cmd.name}':`, err);
            }
        }

        for (const cmd of toDelete) {
            try {
                await safeRequest(app.requestHandler, "DELETE", `/applications/${appId}/commands/${cmd.id}`, true);
                consola.warn(`Deleted stale command: ${cmd.name}`);
            } catch (err) {
                consola.error(`Failed to delete '${cmd.name}':`, err);
            }
        }

        const afterSync = await safeRequest(app.requestHandler, "GET", `/applications/${appId}/commands`, true);
        const missing = formattedCommands.filter(cmd => !afterSync.find((ac: any) => ac.name === cmd.name));

        if (missing.length > 0) {
            consola.warn("Some commands didn’t register on the first pass, retrying...");
            for (const cmd of missing) {
                try {
                    await safeRequest(app.requestHandler, "POST", `/applications/${appId}/commands`, true, cmd);
                    consola.success(`Re-registered: ${cmd.name}`);
                } catch (err) {
                    consola.error(`Persistent failure registering '${cmd.name}':`, err);
                }
            }
        }

        consola.success("All global commands verified and synchronized successfully.");
    } catch (error) {
        consola.error("Fatal error during command registration:", error);
    }
}

async function start() {
    consola.info("Connecting to Discord...");

    app.once("ready", async () => {
        consola.success("Connected to Discord!");
        await registerCommands();
        setActivity();
        consola.success("The App is ready!");

        await log({
            components: [
                {
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `### <:settings:1426875133385244703> ${app.user.username}#${app.user.discriminator} process started!`
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
                    ]
                },
                {
                    type: Constants.ComponentTypes.SEPARATOR
                }
            ],
        })
    });

    app.on("interactionCreate", async (interaction: AnyInteractionGateway) => {
        if (interaction.type === Constants.InteractionTypes.APPLICATION_COMMAND) {
            const { name } = interaction.data;
            consola.info(`Received command: ${name}`);

            try {
                const cmds = await loadCommands();
                const command = cmds.find(c => c.name === name);

                if (command!.empheral) {
                    await interaction.defer(Constants.MessageFlags.EPHEMERAL);
                } else {
                    await interaction.defer();
                }

                if (command!.guildOnly && !interaction.guild?.id) {
                    await MessageHandler.warning(interaction, "This command can only be used in servers.");
                    return;
                }

                if (command) await command.function(interaction);
            } catch (error) {
                await MessageHandler.error(interaction, error, `Command: ${name}`);
                consola.warn(name, "- Command execution error:", error);
            }
        } else if(interaction instanceof ComponentInteraction) {
            const customId = interaction.data.custom_id;
            consola.info(`Component interaction received: ${customId}`);

            try {
                const componentPath = path.resolve(__dirname, "..", "customs", `${customId}.js`);
                const module = await import(pathToFileURL(componentPath).href);
                const handler = module.default ?? module;

                if (typeof handler !== "function") {
                    throw new Error(`Component handler for ${customId} does not export a function`);
                }

                await handler(interaction);

            } catch (err: any | Error) {
                consola.error(`Failed to handle component: ${customId}`, err);
                await MessageHandler.raw(interaction, {
                    components: [
                        {
                            type: Constants.ComponentTypes.CONTAINER,
                            components: [
                                {
                                    type: Constants.ComponentTypes.TEXT_DISPLAY,
                                    content: err ? err.message : err,
                                }
                            ]
                        }
                    ]
                });
            }
        } else {
            return;
        }
    });

    process.on("SIGINT", () => {
        consola.warn("Killing the bot...");
        app.disconnect({ reconnect: false });
        process.exit(0);
    });

    await app.connect();
}

export default start;
