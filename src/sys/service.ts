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
import {AnyInteractionGateway, ComponentInteraction, Constants, SelfStatus} from "@projectdysnomia/dysnomia";
import { config } from "dotenv";
config({ override: true, quiet: true });

import app from "./appHandler.js";
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

async function registerCommands() {
    consola.info("Registering commands...");

    try {
        const appId = app.user.id;
        const existingCommands: unknown | any = await app.requestHandler.request(
            "GET",
            `/applications/${appId}/commands`,
            true
        );
        const cmds: Command[] = await loadCommands();
        const commandsToRegister = cmds.map(cmd => ({
            ...cmd,
            integration_types: [0, 1], // 0 = guild install, 1 = user install (personal)
            contexts: [0, 1, 2], // 0 = guild, 1 = bot DM, 2 = private channel
        }));


        const commandsToUpsert = cmds.filter(localCmd => {
            const existing = existingCommands.find(
                (gc: { name: string; type: number; }) => gc.name === localCmd.name && gc.type === localCmd.type
            );
            return !existing || JSON.stringify(localCmd) !== JSON.stringify(existing);
        });

        const commandsToDelete = existingCommands.filter(
            (gc: { name: string; type: number; }) => !cmds.some(localCmd => localCmd.name === gc.name && localCmd.type === gc.type)
        );

        if (commandsToUpsert.length > 0) {
            consola.info("Adding/updating commands:", commandsToUpsert.map(cmd => cmd.name));
            // @ts-ignore
            await app.requestHandler.request("PUT", `/applications/${appId}/commands`, true, commandsToRegister);
        } else {
            consola.info("No new commands to add or update.");
        }

        for (const cmd of commandsToDelete) {
            consola.warn(`Deleting old command: ${cmd.name}`);
            await app.requestHandler.request("DELETE", `/applications/${appId}/commands/${cmd.id}`, true);
        }

        consola.success("Global slash and user context commands synced!");
    } catch (error) {
        consola.error("Failed to register commands:", error);
        // throw error;
    }
}

async function start() {
    consola.info("Connecting to Discord...");

    app.once("ready", async () => {
        consola.success("Connected to Discord!");
        await registerCommands();
        setActivity();
        consola.success("The App is ready!");
    });

    app.on("interactionCreate", async (interaction: AnyInteractionGateway) => {
        if (interaction.type === Constants.InteractionTypes.APPLICATION_COMMAND) {
            const { name } = interaction.data;
            consola.info(`Received command: ${name}`);

            try {
                const cmds = await loadCommands();
                const command = cmds.find(c => c.name === name);

                await interaction.defer();

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

            await interaction.defer();

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
