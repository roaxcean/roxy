//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

export class RobloxError extends Error {
    constructor(message: string, public status?: number) {
        super(message);
        this.status = status;
        this.name = "RobloxError";
    }
}

const TIMEOUT_MS = 15_000;

async function rbx<T = any>(url: string, init?: RequestInit): Promise<T> {
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
                if (first) msg = first;
            } catch { /* empty */ }
            throw new RobloxError(msg, res.status);
        }

        return res.json() as Promise<T>;
    } catch (err: any) {
        if (err instanceof RobloxError) throw err;
        if (err?.name === "AbortError") throw new RobloxError("Roblox API timed out.");
        throw new RobloxError(err?.message ?? String(err));
    } finally {
        clearTimeout(timer);
    }
}

export interface RobloxUser {
    id: number;
    name: string;
    displayName: string;
    description: string;
    created: string;
    isBanned: boolean;
    hasVerifiedBadge: boolean;
}

export async function resolveUser(input: string): Promise<RobloxUser> {
    const trimmed = input.trim();

    if (/^\d+$/.test(trimmed)) {
        return rbx<RobloxUser>(`https://users.roblox.com/v1/users/${trimmed}`);
    }

    const data = await rbx<{ data: { id: number }[] }>(
        "https://users.roblox.com/v1/usernames/users",
        {
            method: "POST",
            body: JSON.stringify({ usernames: [trimmed], excludeBannedUsers: false }),
        }
    );

    if (!data.data?.length) throw new RobloxError(`User "${trimmed}" not found.`);

    return rbx<RobloxUser>(`https://users.roblox.com/v1/users/${data.data[0].id}`);
}

export type AvatarType = "AvatarThumbnail" | "AvatarBust" | "AvatarHeadShot";

// each avatar type uses a different endpoint path, the type= query param on
// the full-body endpoint is ignored by Roblox for bust/headshot
const AVATAR_ENDPOINT: Record<AvatarType, string> = {
    AvatarThumbnail: "avatar",
    AvatarBust:      "avatar-bust",
    AvatarHeadShot:  "avatar-headshot",
};

export async function getAvatarUrl(
    userId: number,
    type: AvatarType = "AvatarThumbnail",
    size = "420x420"
): Promise<string | null> {
    const endpoint = AVATAR_ENDPOINT[type];
    try {
        const data = await rbx<{ data: { imageUrl: string; state: string }[] }>(
            `https://thumbnails.roblox.com/v1/users/${endpoint}?userIds=${userId}&size=${size}&format=Png&isCircular=false`
        );
        const thumb = data.data?.[0];
        return thumb?.state === "Completed" ? thumb.imageUrl : null;
    } catch {
        return null;
    }
}

export function fmtNum(n: number): string {
    return n.toLocaleString("en-US");
}

export function fmtDate(iso: string): string {
    const s = Math.floor(new Date(iso).getTime() / 1000);
    return `<t:${s}:D>`;
}

export function trunc(s: string, max = 40): string {
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export { rbx };