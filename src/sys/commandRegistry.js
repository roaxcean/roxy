//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { consola } from "consola";
import { Constants } from "@projectdysnomia/dysnomia";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMMANDS_DIR = path.resolve(__dirname, "..", "commands");
/** Fully-loaded command objects, keyed by command name. */
const commandMap = new Map();
const subcommandHandlerCache = new Map();
/**
 * Cooldown bucket key → expiry timestamp (ms since epoch).
 * Keys are `"commandName:scope:scopeId"`.
 */
const cooldownMap = new Map();
function cooldownKey(commandName, config, userId, guildId) {
    const scopeId = config.scope === "user" ? userId :
        config.scope === "guild" ? (guildId ?? "dm") :
            /* global */ "global";
    return `${commandName}:${config.scope}:${scopeId}`;
}
/**
 * Check if a cooldown is active.
 * @returns Remaining milliseconds, or 0 if the user is free to proceed.
 */
export function checkCooldown(commandName, config, userId, guildId) {
    const key = cooldownKey(commandName, config, userId, guildId);
    const expiry = cooldownMap.get(key);
    if (!expiry)
        return 0;
    const remaining = expiry - Date.now();
    if (remaining <= 0) {
        cooldownMap.delete(key);
        return 0;
    }
    return remaining;
}
/** Record a new cooldown for a user/guild/global. */
export function recordCooldown(commandName, config, userId, guildId) {
    const key = cooldownKey(commandName, config, userId, guildId);
    cooldownMap.set(key, Date.now() + config.duration);
}
async function loadFile(filePath) {
    const mod = await import(pathToFileURL(filePath).href);
    return mod.default ?? mod;
}
async function buildCommandMap() {
    const map = new Map();
    const entries = await readdir(COMMANDS_DIR, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(COMMANDS_DIR, entry.name);
        if (entry.isDirectory()) {
            // group command, gather subcommands to build the options list
            const subEntries = await readdir(fullPath, { withFileTypes: true });
            const options = [];
            let inferredCategory;
            for (const sub of subEntries) {
                // skip internal helper files (prefixed with _)
                if (!sub.isFile() || !sub.name.endsWith(".js") || sub.name.startsWith("_"))
                    continue;
                const subCmd = await loadFile(path.join(fullPath, sub.name));
                // infer category from the first subcommand that declares one
                if (!inferredCategory && subCmd.category)
                    inferredCategory = subCmd.category;
                options.push({
                    type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
                    name: subCmd.name,
                    description: subCmd.description ?? "No description",
                    options: subCmd.options ?? [],
                    // carry hidden flag so /help can filter individual subcommands
                    hidden: subCmd.hidden ?? false,
                });
            }
            // the directory itself acts as the parent, we synthesise a Command
            // that holds the metadata; the real handler lives in the sub files
            const parent = {
                name: entry.name,
                description: `Commands for ${entry.name}`,
                category: inferredCategory,
                function: async () => {
                    throw new Error(`Parent command "${entry.name}" has no top-level handler`);
                },
                options,
                type: Constants.ApplicationCommandTypes.CHAT_INPUT,
            };
            // try to load an optional index.js for parent-level metadata overrides
            try {
                const indexPath = path.join(fullPath, "index.js");
                const meta = await loadFile(indexPath);
                Object.assign(parent, meta, { options }); // keep built options
            }
            catch {
                // no index.js, that's fine
            }
            map.set(entry.name, parent);
            continue;
        }
        if (entry.isFile() && entry.name.endsWith(".js") && !entry.name.startsWith("_")) {
            const cmd = await loadFile(fullPath);
            map.set(cmd.name, cmd);
        }
    }
    return map;
}
/**
 * Load (or return cached) commands.
 * Safe to call multiple times — returns from cache after first load.
 */
export async function loadCommands() {
    if (commandMap.size > 0)
        return [...commandMap.values()];
    await reloadCommands();
    return [...commandMap.values()];
}
/**
 * Force a full reload of all command modules.
 * Used by the hot-reload command and during startup registration.
 */
export async function reloadCommands() {
    consola.info("[registry] Loading commands…");
    // Clear module cache for command files so re-imports pick up changes
    subcommandHandlerCache.clear();
    const fresh = await buildCommandMap();
    commandMap.clear();
    for (const [k, v] of fresh)
        commandMap.set(k, v);
    consola.success(`[registry] Loaded ${commandMap.size} top-level commands.`);
    return [...commandMap.values()];
}
/**
 * Resolve and cache a subcommand handler + its full metadata.
 * Returns `null` if the subcommand file doesn't exist or has no function.
 */
export async function resolveSubcommandHandler(parentName, subName) {
    const cacheKey = `${parentName}/${subName}`;
    if (subcommandHandlerCache.has(cacheKey)) {
        return subcommandHandlerCache.get(cacheKey);
    }
    const filePath = path.join(COMMANDS_DIR, parentName, `${subName}.js`);
    try {
        const mod = await loadFile(filePath);
        const fn = mod.function ?? mod;
        if (typeof fn !== "function")
            return null;
        const resolved = { fn, meta: mod };
        subcommandHandlerCache.set(cacheKey, resolved);
        return resolved;
    }
    catch {
        return null;
    }
}
/**
 * Return all non-hidden commands, suitable for display in /help.
 */
export async function getCommandsForHelp() {
    const cmds = await loadCommands();
    return cmds.filter(c => !c.hidden);
}
/**
 * Build the raw Discord API payload for bulk command registration.
 */
export async function buildRegistrationPayload() {
    const commands = await loadCommands();
    return commands.map(cmd => ({
        name: cmd.name,
        description: cmd.description ?? "No description",
        type: cmd.type ?? Constants.ApplicationCommandTypes.CHAT_INPUT,
        options: cmd.options ?? [],
        integration_types: [0, 1],
        contexts: [0, 1, 2],
    }));
}
