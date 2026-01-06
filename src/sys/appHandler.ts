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

const intentsBitfield = INTENTS.reduce((acc, v) => acc | v, 0);

const app = new Client(
    `Bot ${process.env.DISCORD_TOKEN}`,
    {
        allowedMentions: {
            everyone: false,
            repliedUser: true,
            roles: true,
            users: true,
        },
        defaultImageFormat: "png",
        defaultImageSize: 256,
        gateway: {
            intents: intentsBitfield,
        },
        restMode: true,
        rest: {
            ratelimiterOffset: 0,
        }
    }
);
const ignore = [
    1001,
    1006,
    "ECONNRESET",
];

app.on("error", (err: any) => {
    if (ignore.includes(err?.code)) {
        return;
    }
    throw err;
})

export default app;