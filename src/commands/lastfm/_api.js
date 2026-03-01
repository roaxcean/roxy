//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/
const BASE = "https://ws.audioscrobbler.com/2.0/";
export class LastfmError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.code = code;
        this.name = "LastfmError";
    }
}
export async function lfm(method, params) {
    const key = process.env.LASTFM_API_KEY;
    if (!key)
        throw new LastfmError(0, "LASTFM_API_KEY is not configured.");
    const url = new URL(BASE);
    Object.entries({ ...params, method, api_key: key, format: "json" })
        .forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error)
        throw new LastfmError(data.error, data.message ?? "Last.fm API error");
    return data;
}
/** Format a play count nicely */
export function fmtPlays(n) {
    return Number(n).toLocaleString();
}
/** Truncate a string to a max length */
export function trunc(s, max = 40) {
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
/** Last.fm user image (pick largest available) */
export function lfmImage(images) {
    if (!images?.length)
        return null;
    const large = images.find((i) => i.size === "extralarge") ??
        images.find((i) => i.size === "large") ??
        images[images.length - 1];
    return large?.["#text"] || null;
}
