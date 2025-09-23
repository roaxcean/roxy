import { consola } from "consola";
const nodeVer = parseInt(process.versions.node.split(".")[0], 10);
const maxTrace = process.env.NODE_ENV === "development" ? Infinity : 8;

if (nodeVer < 22) {
    consola.error(`Node.js ${nodeVer} is unsupported! Please install Node.js 22 or above.`);
    process.exit(1);
}
consola.start(`Running on Node.js ${process.versions.node}.`)

async function handleError(err: any) {
    if (err && err.message && err.message.startsWith("Unhandled MESSAGE_CREATE type")) return;

    if (err) {
        if (typeof err === "string") {
            consola.error(`Error: ${err}`);
        } else if (err.message === "Disallowed intents specified") {
            consola.error(
                "Disallowed intents specified\n|\n" +
                "| To run the bot, enable 'Server Members Intent' in the Discord Developer Portal:\n|\n" +
                "| 1. Go to https://discord.com/developers/applications\n" +
                "| 2. Click on your bot\n" +
                "| 3. Click 'Bot' in the sidebar\n" +
                "+ 4. Turn on 'Server Members Intent'"
            );
        } else {
            let stackLines = (err.stack || "").split("\n");
            if (stackLines.length > (maxTrace + 2)) {
                stackLines = stackLines.slice(0, maxTrace);
                stackLines.push(`    ...stack trace truncated to ${maxTrace} lines.`);
            }
            const finalStack = stackLines.join("\n");
            const errorPrefix = err.code ? `${err.code}: ` : "Unknown: ";
            consola.error(errorPrefix + finalStack);
        }
    }

    consola.error("Cannot continue. Reboot required.");
    process.exit(1)
}

// ------------------------- //
import dotenv from "dotenv";
import { Client, Events, GatewayIntentBits, Collection, MessageFlags } from "discord.js";
import fs from "fs";
import path from "path";

dotenv.config({ override: true, quiet: true });

const token = process.env.DISCORD_TOKEN;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, readyClient => {
    consola.success(`Ready! Logged in as ${readyClient.user.tag}`);
});

process.on("uncaughtException", handleError);
process.on("unhandledRejection", handleError);
client.login(token);
