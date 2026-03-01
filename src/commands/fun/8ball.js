//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
const RESPONSES = [
    // Positive
    "It is certain.", "It is decidedly so.", "Without a doubt.",
    "Yes, definitely.", "You may rely on it.", "As I see it, yes.",
    "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.",
    // Neutral
    "Reply hazy, try again.", "Ask again later.",
    "Better not tell you now.", "Cannot predict now.",
    "Concentrate and ask again.",
    // Negative
    "Don't count on it.", "My reply is no.", "My sources say no.",
    "Outlook not so good.", "Very doubtful.",
];
export default {
    name: "8ball",
    description: "Ask the magic 8-ball a question",
    options: [
        {
            name: "question",
            description: "Your yes/no question",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
    ],
    async function(interaction) {
        const question = getOption(interaction, "question");
        const answer = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        await MessageHandler.raw(interaction, {
            components: [
                {
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `## <:crystalball:1477307417397170279> Magic 8-Ball`,
                        },
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `> ${question}`,
                        },
                        {
                            type: Constants.ComponentTypes.SEPARATOR,
                        },
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `**${answer}**`,
                        },
                    ],
                },
            ],
        });
    },
};
