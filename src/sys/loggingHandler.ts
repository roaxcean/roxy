//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import {Constants, InteractionContent, InteractionContentEdit} from "@projectdysnomia/dysnomia";
import { config } from "dotenv";
import app from "../sys/appHandler.js"
import { consola } from "consola";

config({ override: true, quiet: true });

async function log(payload: Partial<InteractionContent> | Partial<InteractionContentEdit>) {
    if (process.env.APP_LOGCHANNEL !== "null") {
        try {
            await app.createMessage(process.env.APP_LOGCHANNEL as string, {
                ...payload,
                flags: Constants.MessageFlags.IS_COMPONENTS_V2,
            })
        } catch (error) {
            consola.error("Unable to send message to channel:", error);
        }
    }
}

export default log;