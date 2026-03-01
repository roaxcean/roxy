//        ____
//       / __ \____  _  ____  __
//      / /_/ / __ \| |/_/ / / /
//     / _, _/ /_/ />  </ /_/ /
//    /_/ |_|\____/_/|_|\__, /
//                     /____/

export interface CooldownConfig {
    /** Duration in milliseconds */
    duration: number;
    /** Scope of the cooldown bucket */
    scope: "user" | "guild" | "global";
}

export interface SubCommand {
    name: string;
    description: string;
    options?: any[];
    function: () => Promise<void>;
}

export interface Command {
    name: string;
    description: string;
    function: () => Promise<void>;

    type?: number;
    options?: any[];

    /** Restrict to servers only */
    guildOnly?: boolean;
    /** Restrict to the bot owner only (inherited by all subcommands) */
    ownerOnly?: boolean;
    /** Whether the initial defer + response is ephemeral */
    visibility?: "ephemeral" | "public";

    /** Grouping label shown in /help */
    category?: string;
    /** Exclude from /help listing */
    hidden?: boolean;

    cooldown?: CooldownConfig;
}

// voltradio.me
export interface StationResponse {
    station: {
        id: number;
        name: string;
        shortcode: string;
        description: string;
        frontend: string;
        backend: string;
        timezone: string;
        listen_url: string;
        url: string;
        public_player_url: string;
        playlist_pls_url: string;
        playlist_m3u_url: string;
        is_public: boolean;
        requests_enabled: boolean;
        mounts: Mount[];
        remotes: any[];
        hls_enabled: boolean;
        hls_is_default: boolean;
        hls_url: string | null;
        hls_listeners: number;
    };
    listeners: Listeners;
    live: Live;
    now_playing: NowPlaying;
    playing_next: PlayingNext;
    song_history: {}[];
    is_online: boolean;
    cache: any | null;
}

export interface Mount {
    id: number;
    name: string;
    url: string;
    bitrate: number;
    format: string;
    listeners: Listeners;
    path: string;
    is_default: boolean;
}

export interface Listeners {
    total: number;
    unique: number;
    current: number;
}

export interface Live {
    is_live: boolean;
    streamer_name: string;
    broadcast_start: number | null;
    art: string | null;
}

export interface Song {
    id: string;
    art: string;
    custom_fields: any[];
    text: string;
    artist: string;
    title: string;
    album: string;
    genre: string;
    isrc: string;
    lyrics: string;
}

export interface NowPlaying {
    sh_id: number;
    played_at: number;
    duration: number;
    playlist: string;
    streamer: string;
    is_request: boolean;
    song: Song;
    elapsed: number;
    remaining: number;
}

export interface PlayingNext {
    cued_at: number;
    played_at: number;
    duration: number;
    playlist: string;
    is_request: boolean;
    song: Song;
}