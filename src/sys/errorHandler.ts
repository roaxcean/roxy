//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { consola } from "consola";
import { Constants } from "@projectdysnomia/dysnomia";
import log from "./loggingHandler.js";
const maxTrace = process.env.NODE_ENV === "development" ? Infinity : 8;

async function handleError(err: any) {
    if (err && err.message && ( err.message.startsWith("Unhandled MESSAGE_CREATE type"))) return false;

    if (err) {
        if (typeof err === "string") {
            consola.error(`Error: ${err}`);
        } else if (err.message === "Disallowed intents specified") {
            consola.error(
                "Disallowed intents specified\n|\n" +
                "| To run the bot, enable 'Message Content Intent' in the Discord Developer Portal:\n|\n" +
                "| 1. Go to https://discord.com/developers/applications\n" +
                "| 2. Click on your bot\n" +
                "| 3. Click 'Bot' in the sidebar\n" +
                "+ 4. Turn on 'Message Content Intent'"
            );
        } else if (err.message.startsWith("Invalid Form Body")) {
            consola.warn(err.message);
            return false;
        } else {
            let stackLines = (err.stack || "").split("\n");
            if (stackLines.length > (maxTrace + 2)) {
                stackLines = stackLines.slice(0, maxTrace);
                stackLines.push(`    ...stack trace truncated to ${maxTrace} lines.`);
            }
            const finalStack = stackLines.join("\n");
            const errorPrefix = err.code ? `${err.code}: ` : "Unknown: ";
            consola.error(errorPrefix + finalStack);

            await log({
                components: [
                    {
                        type: Constants.ComponentTypes.CONTAINER,
                        components: [
                            {
                                type: Constants.ComponentTypes.TEXT_DISPLAY,
                                content: `### <:settings:1426875133385244703> Roxy process errored!`
                            },
                            {
                                type: Constants.ComponentTypes.TEXT_DISPLAY,
                                content: `\`\`\`\n${errorPrefix + finalStack}\n\`\`\``
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
            });
        }
    }



    consola.error("Cannot continue. Reboot required.");
    return true;
}

export default handleError;