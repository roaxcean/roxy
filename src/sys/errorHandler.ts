//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

import { consola } from "consola";
import { Constants } from "@projectdysnomia/dysnomia";
import log from "./loggingHandler.js";
import { buildPingLine } from "./appConfig.js";

const MAX_STACK_LINES = process.env.NODE_ENV === "development" ? Infinity : 8;

/** Errors matching these messages are noisy non-issues — skip them entirely. */
const IGNORED_MESSAGES = [
    "Unhandled MESSAGE_CREATE type",
];

/**
 * Transient network/system error codes that should never kill the process.
 * These are OS-level codes (err.code) that indicate a momentary connectivity
 * blip — DNS timeout, connection reset, socket hang-up, etc.
 */
const TRANSIENT_CODES = new Set([
    "ENOTFOUND",    // dns resolution failed (host unreachable / no internet)
    "ECONNRESET",   // connection reset by peer
    "ECONNREFUSED", // nothing listening on that port
    "ECONNABORTED", // connection aborted mid-flight
    "ETIMEDOUT",    // tcp-level timeout
    "ENETUNREACH",  // no route to host
    "EHOSTUNREACH", // host unreachable
    "EPIPE",        // broken pipe (write to closed socket)
]);

function isIgnored(err: unknown): boolean {
    if (!err) return true;
    const msg  = (err as any)?.message ?? "";
    const code = (err as any)?.code    ?? "";
    return (
        IGNORED_MESSAGES.some(s => msg.startsWith(s)) ||
        TRANSIENT_CODES.has(code)
    );
}

/**
 * Format an error into a plain string suitable for logging.
 * Pure function — no side effects.
 */
export function formatError(err: unknown): string {
    if (typeof err === "string") return err;

    const e = err as any;
    const prefix = e?.code ? `${e.code}: ` : "Unknown: ";
    const rawStack: string = e?.stack ?? String(err);

    const lines = rawStack.split("\n");
    const capped =
        isFinite(MAX_STACK_LINES) && lines.length > MAX_STACK_LINES + 2
            ? [
                ...lines.slice(0, MAX_STACK_LINES),
                `    …stack truncated to ${MAX_STACK_LINES} lines`,
            ]
            : lines;

    return prefix + capped.join("\n");
}

/**
 * Handle a process-level error.
 *
 * @param err     - The error to handle.
 * @param guildId - Guild context, if known (used to pick the right ping target).
 */
async function handleError(err: unknown, guildId?: string): Promise<boolean> {
    if (isIgnored(err)) return false;

    const e = err as any;

    if (e?.message === "Disallowed intents specified") {
        consola.error(
            "Disallowed intents specified\n|\n" +
            "| To run the bot, enable all intents in the Discord Developer Portal:\n|\n" +
            "| 1. Go to https://discord.com/developers/applications\n" +
            "| 2. Click on your bot\n" +
            "| 3. Click 'Bot' in the sidebar\n" +
            "+ 4. Turn on all intents"
        );
        return true; // exit
    }

    // ── Noisy but recoverable: Discord form validation errors ──
    if (e?.message?.startsWith("Invalid Form Body")) {
        consola.warn(`[form] ${e.message}`);
        return false;
    }

    // ── Everything else: log, ping, keep running ──
    const formatted = formatError(err);
    consola.error(formatted);

    const pingLine = await buildPingLine(guildId);

    await log({
        components: [
            {
                type: Constants.ComponentTypes.CONTAINER,
                components: [
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: "### <:settings:1426875133385244703> Process errored!",
                    },
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: `\`\`\`\n${formatted}\n\`\`\``,
                    },
                    {
                        type: Constants.ComponentTypes.TEXT_DISPLAY,
                        content: pingLine,
                    },
                ],
            },
            {
                type: Constants.ComponentTypes.SEPARATOR,
            },
        ],
    });

    return false;
}

export default handleError;