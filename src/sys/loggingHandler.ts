//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

/**
 * loggingHandler — fan-out logger.
 *
 * Reads log channels from appConfig (settingsStore) at send time, so hot
 * changes take effect immediately without a restart.
 *
 * Per channel behaviour:
 *  • Validates Roxy can send (channel exists, bot has SEND_MESSAGES +
 *    VIEW_CHANNEL) before attempting — skips silently if not.
 *  • Failed sends are buffered per-channel and retried on the next call.
 *  • If no channels are configured the call is a silent no-op.
 */

import { Constants, InteractionContent, InteractionContentEdit } from "@projectdysnomia/dysnomia";
import { consola } from "consola";
import app from "./appHandler.js";
import { getLogChannels } from "./appConfig.js";

type LogPayload = Partial<InteractionContent> | Partial<InteractionContentEdit>;

// per-channel pending buffer: channelId → queued payloads
const pendingBuffers = new Map<string, LogPayload[]>();

const SEND_MESSAGES  = BigInt(0x800);   // 1 << 11
const VIEW_CHANNEL   = BigInt(0x400);   // 1 << 10
const EMBED_LINKS    = BigInt(0x4000);  // 1 << 14
const REQUIRED_PERMS = SEND_MESSAGES | VIEW_CHANNEL | EMBED_LINKS;

/**
 * Quick sanity-check: can Roxy actually post in this channel?
 * Returns false (skip silently) if the channel doesn't exist, is not a text
 * channel, or the bot is missing required permissions.
 */
async function canSendTo(channelId: string): Promise<boolean> {
    try {
        // getChannel is synchronous (cache only), fall back to REST if missing
        const channel = app.getChannel(channelId) ?? await app.getRESTChannel(channelId);
        if (!channel) return false;

        // only text-capable channel types: 0 = GUILD_TEXT, 5 = ANNOUNCEMENT
        if (!("permissionsOf" in channel)) return false;

        const me = app.user?.id;
        if (!me) return false;

        const perms = BigInt((channel as any).permissionsOf(me).allow ?? 0);
        return (perms & REQUIRED_PERMS) === REQUIRED_PERMS;
    } catch {
        return false;
    }
}

async function sendOne(channelId: string, payload: LogPayload): Promise<boolean> {
    if (!await canSendTo(channelId)) {
        consola.warn(`[log] Skipping channel ${channelId} — missing access or permissions.`);
        return false; // treat as skip, not retry-worthy
    }

    try {
        await app.createMessage(channelId, {
            ...payload,
            flags: Constants.MessageFlags.IS_COMPONENTS_V2,
        });
        return true;
    } catch (err) {
        consola.warn(`[log] Failed to send to channel ${channelId}:`, err);
        return false;
    }
}

function bufferFor(channelId: string): LogPayload[] {
    if (!pendingBuffers.has(channelId)) pendingBuffers.set(channelId, []);
    return pendingBuffers.get(channelId)!;
}

async function flushChannel(channelId: string): Promise<void> {
    const buf = bufferFor(channelId);
    while (buf.length > 0) {
        const ok = await sendOne(channelId, buf[0]);
        if (!ok) break;
        buf.shift();
    }
}

/**
 * Send a structured log message to every configured log channel.
 *
 * Each channel is attempted independently — one failing does not block others.
 * Failed sends are buffered per-channel and retried on the next log call.
 */
async function log(payload: LogPayload): Promise<void> {
    const channels = await getLogChannels();

    if (channels.length === 0) return; // nothing configured, silent no-op

    await Promise.all(channels.map(async ({ channelId }) => {
        // flush any backed-up messages for this channel first
        await flushChannel(channelId);

        const ok = await sendOne(channelId, payload);
        if (!ok) {
            const buf = bufferFor(channelId);
            if (buf.length < 50) {
                buf.push(payload);
            } else {
                consola.warn(`[log] Buffer full for ${channelId} — dropping oldest entry.`);
                buf.shift();
                buf.push(payload);
            }
        }
    }));
}

export default log;