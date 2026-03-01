//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { Client, Constants } from "@projectdysnomia/dysnomia";
import { config } from "dotenv";

config({ override: true, quiet: true });

const INTENTS = [
    Constants.Intents.messageContent,
    Constants.Intents.guilds,
    Constants.Intents.guildMessages,
    Constants.Intents.guildMembers,
    Constants.Intents.directMessages,
];

/** Error codes that are safe to swallow silently (network blips, clean closes) */
const IGNORED_ERROR_CODES: (number | string)[] = [1001, 1006, "ECONNRESET"];

const app = new Client(`Bot ${process.env.DISCORD_TOKEN}`, {
    allowedMentions: {
        everyone: false,
        repliedUser: true,
        roles: true,
        users: true,
    },
    defaultImageFormat: "png",
    defaultImageSize: 256,
    gateway: {
        intents: INTENTS.reduce((acc, v) => acc | v, 0),
    },
    restMode: true,
    rest: {
        ratelimiterOffset: 0,
    },
});

app.on("error", (err: any) => {
    if (IGNORED_ERROR_CODES.includes(err?.code)) return;
    // re-throw so the global uncaughtException handler in index.ts picks it up
    throw err;
});

export default app;