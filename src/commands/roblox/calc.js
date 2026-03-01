//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../../sys/messageHandler.js";
import { getOption } from "../../sys/optionResolver.js";
import { fmtNum } from "./_api.js";
// Roblox marketplace takes 30% on every sale
const MARKET_CUT = 0.30;
// DevEx rate: $0.0035 USD per Robux (as of current Roblox policy, 350 <:robux:1477400594967826494> per $1)
const DEVEX_RATE = 0.0035;
function fmtUSD(amount) {
    return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
export default {
    name: "calc",
    description: "Robux marketplace tax and DevEx calculators",
    category: "<:roblox:1477118697402400939> Roblox",
    options: [
        {
            name: "mode",
            description: "What to calculate",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
            choices: [
                { name: "Tax — how much you receive after the 30% cut", value: "tax" },
                { name: "Price — what to list at to receive a target amount", value: "price" },
                { name: "DevEx — convert Robux to USD", value: "devex" },
            ],
        },
        {
            name: "amount",
            description: "Robux amount to calculate",
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            required: true,
            min_value: 1,
        },
    ],
    async function(interaction) {
        const mode = getOption(interaction, "mode");
        const amount = getOption(interaction, "amount");
        if (amount <= 0) {
            await MessageHandler.warning(interaction, "Amount must be greater than 0.");
            return;
        }
        let lines;
        let title;
        if (mode === "tax") {
            // You sell at X — how much do you get?
            const cut = Math.floor(amount * MARKET_CUT);
            const received = amount - cut;
            const devex = received * DEVEX_RATE;
            title = "<:coin:1477307686180880444> After-tax calculation";
            lines = [
                `**Listing price** <:robux:1477400594967826494> ${fmtNum(amount)}`,
                `**Marketplace cut (30%)** <:robux:1477400594967826494> −${fmtNum(cut)}`,
                `**You receive** <:robux:1477400594967826494> ${fmtNum(received)}`,
                ``,
                `**DevEx value** ${fmtUSD(devex)}`,
            ];
        }
        else if (mode === "price") {
            // You want to receive X — what should you list at?
            const listing = Math.ceil(amount / (1 - MARKET_CUT));
            const cut = listing - amount;
            const devex = amount * DEVEX_RATE;
            title = "<:coin:1477307686180880444> Listing price calculation";
            lines = [
                `**Target received** <:robux:1477400594967826494> ${fmtNum(amount)}`,
                `**You should list at** <:robux:1477400594967826494> ${fmtNum(listing)}`,
                `**Marketplace cut (30%)** <:robux:1477400594967826494> −${fmtNum(cut)}`,
                ``,
                `**DevEx value of received** ${fmtUSD(devex)}`,
            ];
        }
        else {
            // DevEx conversion
            const usd = amount * DEVEX_RATE;
            const threshold = 30_000; // minimum for DevEx eligibility
            title = "<:coin:1477307686180880444> DevEx conversion";
            lines = [
                `**Robux** <:robux:1477400594967826494> ${fmtNum(amount)}`,
                `**USD value** ${fmtUSD(usd)}`,
                `**Rate** 350 <:robux:1477400594967826494> = $1.00 USD`,
                amount < threshold
                    ? `\n<:alert:1467501544294322405> DevEx minimum is <:robux:1477400594967826494> ${fmtNum(threshold)} — you need <:robux:1477400594967826494> ${fmtNum(threshold - amount)} more.`
                    : `\n<:check:1435737072085237930> Above DevEx minimum (<:robux:1477400594967826494> ${fmtNum(threshold)}).`,
            ];
        }
        await MessageHandler.raw(interaction, {
            components: [{
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `**${title}**`,
                        },
                        { type: Constants.ComponentTypes.SEPARATOR },
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: lines.join("\n"),
                        },
                    ],
                }],
        });
    },
};
