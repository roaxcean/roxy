//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

export interface Command {
    name: string;
    description: string;
    type: number;
    guildOnly: boolean;
    function: Function;
}