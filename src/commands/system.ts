//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CommandInteraction, Constants } from "@projectdysnomia/dysnomia";
import { MessageHandler } from "../sys/messageHandler.js";
import app from "../sys/appHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const TOTAL_PAGES = 3;

function fmtBytes(bytes: number): string {
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 ** 2);
    return `${mb.toFixed(0)} MB`;
}

function fmtLoadAvg(load: number[]): string {
    return load.map(l => l.toFixed(2)).join(" / ");
}

function readProcUptime(): number {
    try {
        const raw = fs.readFileSync("/proc/uptime", "utf8");
        const s   = parseFloat(raw.split(" ")[0]);
        return isNaN(s) ? process.uptime() : s;
    } catch {
        return process.uptime();
    }
}

function readPackageJson(): Record<string, any> {
    try {
        // walk up from dist/commands to project root
        const pkgPath = path.resolve(__dirname, "../../package.json");
        return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    } catch {
        return {};
    }
}

function buildOsPage(): string {
    const uptimeSec      = readProcUptime();
    const uptimeStart    = Math.floor(Date.now() / 1000 - uptimeSec);
    const totalMem       = os.totalmem();
    const freeMem        = os.freemem();
    const usedMem        = totalMem - freeMem;
    const memPct         = ((usedMem / totalMem) * 100).toFixed(1);

    return [
        "### <:macbook:1495862389663600670> Operating System",
        `> **Platform:** ${os.type()} (${os.platform()})`,
        `> **Release:** ${os.release()}`,
        `> **Architecture:** ${os.arch()}`,
        `> **Hostname:** \`${os.hostname()}\``,
        "",
        "### <:time:1495862477882134619> System Uptime",
        `> **Up since:** <t:${uptimeStart}:R>`,
        "",
        "### <:screwdriver:1495862706815762572> Memory",
        `> **Total:** ${fmtBytes(totalMem)}`,
        `> **Used:** ${fmtBytes(usedMem)} (${memPct}%)`,
        `> **Free:** ${fmtBytes(freeMem)}`,
        "",
        "### <:chartup:1477303809691619534> Load Average *(1m / 5m / 15m)*",
        `> \`${fmtLoadAvg(os.loadavg())}\``,
    ].join("\n");
}

function buildHardwarePage(): string {
    const cpus    = os.cpus();
    const model   = cpus[0]?.model?.trim() ?? "Unknown";
    const cores   = cpus.length;
    const speedMhz = cpus[0]?.speed ?? 0;
    const totalMem = os.totalmem();

    return [
        "### <:flash:1495863815173050579> CPU",
        `> **Model:** ${model}`,
        `> **Logical Cores:** ${cores}`,
        `> **Speed:** ${speedMhz} MHz`,
        "",
        "### <:screwdriver:1495862706815762572> Memory",
        `> **Total RAM:** ${fmtBytes(totalMem)}`,
    ].join("\n");
}

function buildRoxyPage(): string {
    const pkg         = readPackageJson();
    const name        = pkg.name        ?? "roxy";
    const version     = pkg.version     ?? "unknown";
    const description = pkg.description ?? "";
    const nodeVer     = process.version;
    const shardCount  = app.shards.size > 0 ? app.shards.size : 1;
    const guildCount  = app.guilds.size;
    const memUsage    = process.memoryUsage();

    const lines = [
        "### <:bot:1477368913581834402> Roxy",
        `> **Name:** ${name}`,
        `> **Version:** v${version}`,
    ];

    if (description) lines.push(`> **Description:** ${description}`);

    lines.push(
        `> **Source:** [git.roax.lol/r/roxy](https://git.roax.lol/r/roxy)`,
        "",
        "### <:bot:1477368913581834402> Runtime",
        `> **Node.js:** ${nodeVer}`,
        `> **Shards:** ${shardCount}`,
        `> **Guilds:** ${guildCount}`,
        "",
        "### <:screwdriver:1495862706815762572> Process Memory",
        `> **Heap Used:** ${fmtBytes(memUsage.heapUsed)}`,
        `> **Heap Total:** ${fmtBytes(memUsage.heapTotal)}`,
        `> **RSS:** ${fmtBytes(memUsage.rss)}`,
    );

    return lines.join("\n");
}

const PAGE_TITLES = ["OS", "Hardware", "Roxy"];

function buildPage(page: number): string {
    const safe = Math.max(0, Math.min(page, TOTAL_PAGES - 1));
    switch (safe) {
        case 0:  return buildOsPage();
        case 1:  return buildHardwarePage();
        case 2:  return buildRoxyPage();
        default: return buildOsPage();
    }
}

export function buildSystemPage(page: number): { components: any[]; page: number } {
    const safe    = Math.max(0, Math.min(page, TOTAL_PAGES - 1));
    const content = buildPage(safe);

    const tabButtons = Array.from({ length: TOTAL_PAGES }, (_, i) => ({
        type:      Constants.ComponentTypes.BUTTON,
        style:     Constants.ButtonStyles.SECONDARY,
        custom_id: `system_page_${i}`,
        label:     PAGE_TITLES[i],
        disabled:  i === safe,
    }));

    return {
        page: safe,
        components: [
            {
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type:    Constants.ComponentTypes.TEXT_DISPLAY,
                        content: "## <:settings:1426875133385244703> System Info",
                    },
                    {
                        type:    Constants.ComponentTypes.TEXT_DISPLAY,
                        content: `-# ${PAGE_TITLES[safe]} · Page ${safe + 1} of ${TOTAL_PAGES}`,
                    },
                ],
            },
            {
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type:    Constants.ComponentTypes.TEXT_DISPLAY,
                        content,
                    },
                ],
            },
            {
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type:       Constants.ComponentTypes.ACTION_ROW,
                        components: tabButtons,
                    },
                ],
            },
        ],
    };
}

export default {
    name:        "system",
    description: "View system, hardware, and Roxy details",
    type:        Constants.ApplicationCommandTypes.CHAT_INPUT,
    visibility:  "public" as const,
    category:    "<:sparkles:1477364207593852999> About",

    async function(interaction: CommandInteraction) {
        const { components } = buildSystemPage(0);
        await MessageHandler.raw(interaction, { components });
    },
};
