//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
export class RobloxError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.status = status;
        this.name = "RobloxError";
    }
}
const TIMEOUT_MS = 15_000;
async function rbx(url, init) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            ...init,
            signal: controller.signal,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                ...(init?.headers ?? {}),
            },
        });
        if (!res.ok) {
            let msg = `Roblox API returned HTTP ${res.status}`;
            try {
                const body = await res.json();
                const first = body?.errors?.[0]?.message ?? body?.message;
                if (first)
                    msg = first;
            }
            catch { /* empty */ }
            throw new RobloxError(msg, res.status);
        }
        return res.json();
    }
    catch (err) {
        if (err instanceof RobloxError)
            throw err;
        if (err?.name === "AbortError")
            throw new RobloxError("Roblox API timed out.");
        throw new RobloxError(err?.message ?? String(err));
    }
    finally {
        clearTimeout(timer);
    }
}
export async function resolveUser(input) {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) {
        return rbx(`https://users.roblox.com/v1/users/${trimmed}`);
    }
    const data = await rbx("https://users.roblox.com/v1/usernames/users", {
        method: "POST",
        body: JSON.stringify({ usernames: [trimmed], excludeBannedUsers: false }),
    });
    if (!data.data?.length)
        throw new RobloxError(`User "${trimmed}" not found.`);
    return rbx(`https://users.roblox.com/v1/users/${data.data[0].id}`);
}
// each avatar type uses a different endpoint path, the type= query param on
// the full-body endpoint is ignored by Roblox for bust/headshot
const AVATAR_ENDPOINT = {
    AvatarThumbnail: "avatar",
    AvatarBust: "avatar-bust",
    AvatarHeadShot: "avatar-headshot",
};
export async function getAvatarUrl(userId, type = "AvatarThumbnail", size = "420x420") {
    const endpoint = AVATAR_ENDPOINT[type];
    try {
        const data = await rbx(`https://thumbnails.roblox.com/v1/users/${endpoint}?userIds=${userId}&size=${size}&format=Png&isCircular=false`);
        const thumb = data.data?.[0];
        return thumb?.state === "Completed" ? thumb.imageUrl : null;
    }
    catch {
        return null;
    }
}
// ─── Formatting ───────────────────────────────────────────────────────────────
export function fmtNum(n) {
    return n.toLocaleString("en-US");
}
export function fmtDate(iso) {
    const s = Math.floor(new Date(iso).getTime() / 1000);
    return `<t:${s}:D>`;
}
export function trunc(s, max = 40) {
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
export { rbx };
