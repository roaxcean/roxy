//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { spawn } from "node:child_process";
import { MessageHandler } from "../../sys/messageHandler.js";
import { teardownPresence } from "../../sys/presence.js";
import app from "../../sys/appHandler.js";
export default {
    name: "reboot",
    description: "Reboot the VPS",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    visibility: "ephemeral",
    ownerOnly: true,
    hidden: true,
    async function(interaction) {
        await MessageHandler.warning(interaction, "Rebooting the VPS now. Roxy will go offline briefly.");
        // Cleanly close the gateway before we lose the process
        teardownPresence();
        app.disconnect({ reconnect: false });
        // Small grace period so the above REST response can be delivered
        setTimeout(() => {
            try {
                spawn("sudo", ["/sbin/shutdown", "-r", "now"], {
                    detached: true,
                    stdio: "ignore",
                }).unref();
            }
            catch (err) {
                console.error("[reboot] Failed to invoke shutdown:", err);
            }
            process.exit(0);
        }, 1_000);
    },
};
