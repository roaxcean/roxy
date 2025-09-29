//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { consola } from "consola";
import { config } from "dotenv";

import handleError from "./sys/errorHandler.js";
import start from "./sys/service.js";
import app from "./sys/appHandler.js";

const nodeVer = parseInt(process.versions.node.split(".")[0], 10);

if (nodeVer < 22) {
    consola.error(`Node.js ${nodeVer} is unsupported! Please install Node.js 22 or above.`);
    process.exit(1);
}

config({ override: true, quiet: true });
consola.start(`Running on Node.js ${process.versions.node}.`);

const wrapper = async (err: any | Error) => {
    const rep = await handleError(err);
    if (rep) {
        app.disconnect({reconnect: false});
        process.exit(1);
    } else {
        return;
    }
}

process.on("uncaughtException", wrapper);
process.on("unhandledRejection", wrapper);
consola.start(`Starting the main bot process.`);

await start();