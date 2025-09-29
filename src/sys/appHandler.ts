//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Client } from "@projectdysnomia/dysnomia";
import { config } from "dotenv";
config({ override: true, quiet: true });

const app = new Client(
    `Bot ${process.env.DISCORD_TOKEN}`,
    {
        allowedMentions: {
            everyone: false,
            repliedUser: true,
            roles: false,
            users: false,
        },
        defaultImageFormat: "png",
        defaultImageSize: 256
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