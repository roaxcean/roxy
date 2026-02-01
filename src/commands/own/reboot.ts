//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { spawn } from "node:child_process";
import { MessageHandler } from "../../sys/messageHandler.js";
import app from "../../sys/appHandler.js";

export default {
    name: "reboot",
    description: "Reboot the VPS for updates",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,

    visibility: "public",
    hidden: false,
    ownerOnly: true,

    async function(interaction: CommandInteraction) {
        await MessageHandler.warning(
            interaction,
            "Rebooting the VPS now. Roxy will go offline for a bit."
        );

        setTimeout(() => {
            try {
                const child = spawn(
                    "sudo",
                    ["/sbin/shutdown", "-r", "now"],
                    {
                        detached: true,
                        stdio: "ignore",
                    }
                );

                child.unref();
            } catch (err) {
                console.error("Failed to reboot VPS:", err);
            }

            process.exit(0);
        }, 1500);

        app.disconnect({ reconnect: false });
    },
};