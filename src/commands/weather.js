//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
// due to the nature of wttr.in, this command is prone
// to failures at runtime, this hopefully won't happen
// too much, depends entirely on wttr.in
import { Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";
import { getOption } from "../sys/optionResolver.js";
const WMO_ICONS = {
    "113": "☀️", "116": "⛅", "119": "☁️", "122": "☁️",
    "143": "🌫️", "176": "🌦️", "179": "🌨️", "182": "🌧️",
    "185": "🌧️", "200": "⛈️", "227": "🌨️", "230": "❄️",
    "248": "🌫️", "260": "🌫️", "263": "🌦️", "266": "🌧️",
    "281": "🌧️", "284": "🌧️", "293": "🌦️", "296": "🌧️",
    "299": "🌧️", "302": "🌧️", "305": "🌧️", "308": "🌧️",
    "311": "🌧️", "314": "🌧️", "317": "🌨️", "320": "🌨️",
    "323": "🌨️", "326": "🌨️", "329": "❄️", "332": "❄️",
    "335": "❄️", "338": "❄️", "350": "🌧️", "353": "🌦️",
    "356": "🌧️", "359": "🌧️", "362": "🌨️", "365": "🌨️",
    "368": "🌨️", "371": "❄️", "374": "🌧️", "377": "🌧️",
    "386": "⛈️", "389": "⛈️", "392": "⛈️", "395": "❄️",
};
function icon(code) { return WMO_ICONS[code] ?? "<:temperaturelow:1477304884876279878>"; }
function windDir(deg) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
}
export default {
    name: "weather",
    description: "Get current weather for a location",
    category: "<:info:1467501339729727662> General",
    options: [
        {
            name: "location",
            description: "City, postcode, or coordinates",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: true,
        },
        {
            name: "units",
            description: "Temperature units (default: metric)",
            type: Constants.ApplicationCommandOptionTypes.STRING,
            required: false,
            choices: [
                { name: "Metric (°C)", value: "metric" },
                { name: "Imperial (°F)", value: "imperial" },
            ],
        },
    ],
    async function(interaction) {
        const location = getOption(interaction, "location");
        const units = getOption(interaction, "units") ?? "metric";
        const encoded = encodeURIComponent(location);
        // wttr.in can be slow on cold requests (10–15s) and occasionally drops
        // the first connection entirely, retry once with a 20s timeout each attempt
        async function fetchWttr() {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 30_000);
            try {
                const res = await fetch(`https://wttr.in/${encoded}?format=j1`, {
                    signal: controller.signal,
                    headers: { "Accept": "application/json", "User-Agent": "RoxyBot/1.0" },
                });
                if (!res.ok)
                    throw new Error(`wttr.in returned HTTP ${res.status}`);
                return await res.json();
            }
            finally {
                clearTimeout(timer);
            }
        }
        let data;
        try {
            try {
                data = await fetchWttr();
            }
            catch (firstErr) {
                // one retry on timeout or network blip
                const isTimeout = firstErr?.name === "AbortError" || firstErr?.message?.includes("fetch failed");
                if (!isTimeout)
                    throw firstErr;
                data = await fetchWttr();
            }
        }
        catch (err) {
            const isTimeout = err?.name === "AbortError";
            await MessageHandler.error(interaction, isTimeout ? "wttr.in did not respond in time." : (err?.message ?? String(err)), "Could not fetch weather data. Check your location spelling and try again.");
            return;
        }
        const current = data.current_condition?.[0];
        const area = data.nearest_area?.[0];
        if (!current || !area) {
            await MessageHandler.warning(interaction, "No weather data returned for that location.");
            return;
        }
        const city = area.areaName?.[0]?.value ?? location;
        const country = area.country?.[0]?.value ?? "";
        const tempC = parseInt(current.temp_C);
        const tempF = parseInt(current.temp_F);
        const feelsC = parseInt(current.FeelsLikeC);
        const feelsF = parseInt(current.FeelsLikeF);
        const desc = current.weatherDesc?.[0]?.value ?? "Unknown";
        const code = current.weatherCode;
        const humidity = current.humidity;
        const windKph = parseInt(current.windspeedKmph);
        const windMph = Math.round(windKph * 0.621371);
        const windDeg = parseInt(current.winddirDegree);
        const visKm = parseInt(current.visibility);
        const visMi = Math.round(visKm * 0.621371);
        const uvIndex = current.uvIndex;
        const isMetric = units === "metric";
        const temp = isMetric ? `${tempC}°C` : `${tempF}°F`;
        const feels = isMetric ? `${feelsC}°C` : `${feelsF}°F`;
        const wind = isMetric ? `${windKph} km/h` : `${windMph} mph`;
        const vis = isMetric ? `${visKm} km` : `${visMi} mi`;
        // Today's forecast
        const today = data.weather?.[0];
        const maxC = today ? parseInt(today.maxtempC) : null;
        const minC = today ? parseInt(today.mintempC) : null;
        const maxF = today ? parseInt(today.maxtempF) : null;
        const minF = today ? parseInt(today.mintempF) : null;
        const high = maxC !== null ? (isMetric ? `${maxC}°C` : `${maxF}°F`) : "?";
        const low = minC !== null ? (isMetric ? `${minC}°C` : `${minF}°F`) : "?";
        const lines = [
            `${icon(code)} **${desc}**`,
            `<:temperaturehigh:1477303726489206915> **${temp}** — feels like ${feels}`,
            `<:chartup:1477303809691619534> High **${high}** · Low **${low}**`,
            `<:droplet:1477303958451130369> Humidity **${humidity}%**`,
            `<:wind:1477304069969412186> Wind **${wind}** ${windDir(windDeg)}`,
            `<:eye:1477304245739978812> Visibility **${vis}**`,
            `<:sun:1477304356071149803> UV Index **${uvIndex}**`,
        ].join("\n");
        await MessageHandler.raw(interaction, {
            components: [{
                    type: Constants.ComponentTypes.CONTAINER,
                    components: [
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: `## <:location:1477304680223609004> ${city}${country ? `, ${country}` : ""}`,
                        },
                        {
                            type: Constants.ComponentTypes.SEPARATOR,
                        },
                        {
                            type: Constants.ComponentTypes.TEXT_DISPLAY,
                            content: lines,
                        },
                    ],
                }],
        });
    },
};
