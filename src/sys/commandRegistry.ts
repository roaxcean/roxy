//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Command } from "./types.js";
import { loadCommands } from "./service.js";

export async function getCommandsForHelp(): Promise<Command[]> {
    const cmds = await loadCommands();

    return cmds.filter(c => !c.hidden);
}
