//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";
import app from "../sys/appHandler.js";

export default {
    name: "ping",
    description: "Check Roxy's response time and gateway latency",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    visibility: "public" as const,
    category: "<:sparkles:1477364207593852999> About",

    async function(interaction: CommandInteraction) {
        // measure round-trip: time between defer and edit
        const start = Date.now();

        // gateway (websocket) latency, average across all shards if sharded
        let wsLatency: number | null = null;
        if (app.shards.size > 0) {
            const latencies = [...app.shards.values()]
                .map(s => (s as any).latency ?? -1)
                .filter((l: number) => l >= 0);
            if (latencies.length > 0) {
                wsLatency = Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length);
            }
        }

        const roundTrip = Date.now() - start;

        const wsLine   = wsLatency !== null ? `**\`${wsLatency}\`ms**` : "*unavailable*";
        const rtLine   = `**\`${roundTrip}\`ms**`;

        await MessageHandler.raw(interaction, {
            components: [
                {
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: "## <:pingpong:1495894178700198058> Pong!",
                        },
                        {
                            type: Constants.ComponentTypes.SEPARATOR,
                        },
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: [
                                `> <:earth:1495876949497614456> **Gateway (WS):** ${wsLine}`,
                                `> <:time:1495862477882134619> **Round-trip:** ${rtLine}`,
                            ].join("\n"),
                        },
                    ],
                },
            ],
        });
    },
};
