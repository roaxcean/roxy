//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import fs from "node:fs";
import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";

/** Read container uptime from /proc/uptime (Linux only). Falls back to process.uptime(). */
function getContainerUptimeSeconds(): number {
    try {
        const raw = fs.readFileSync("/proc/uptime", "utf8");
        const seconds = parseFloat(raw.split(" ")[0]);
        if (!isNaN(seconds)) return seconds;
    } catch {
        // not linux or no permission, fall through
    }
    return process.uptime();
}

function formatUptime(totalSeconds: number): string {
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(" ");
}

export default {
    name: "uptime",
    description: "Show how long Roxy's container has been running",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    visibility: "public" as const,
    category: "<:sparkles:1477364207593852999> About",

    async function(interaction: CommandInteraction) {
        const containerSeconds = getContainerUptimeSeconds();
        const processSeconds   = process.uptime();

        const containerStartUnix = Math.floor((Date.now() / 1000) - containerSeconds);
        const processStartUnix   = Math.floor((Date.now() / 1000) - processSeconds);

        await MessageHandler.raw(interaction, {
            components: [
                {
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: "## <:flash:1495863815173050579> Uptime",
                        },
                        {
                            type: Constants.ComponentTypes.SEPARATOR,
                        },
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: [
                                `> <:docker:1495862039145349242> **Container:** ${formatUptime(containerSeconds)} *(since <t:${containerStartUnix}:R>)*`,
                                `> <:settings:1426875133385244703> **Process:** ${formatUptime(processSeconds)} *(since <t:${processStartUnix}:R>)*`,
                            ].join("\n"),
                        },
                    ],
                },
            ],
        });
    },
};
