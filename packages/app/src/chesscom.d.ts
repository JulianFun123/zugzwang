
declare module "chess-web-api" {
    export interface RequestResponse<T = any> {
        body: T;
        headers: Record<string, string>;
    }

    export type Callback<T = any> = (response: RequestResponse<T>, error?: any) => void;

    export interface ChessWebAPIOptions {
        queue?: boolean;
    }

    export default class ChessWebAPI {
        constructor(options?: ChessWebAPIOptions);

        // --- Player ---
        getPlayer(username: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getPlayerStats(username: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getPlayerOnline(username: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getPlayerCurrentDailyChess(username: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getPlayerToMoveDailyChess(username: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getPlayerMonthlyArchives(username: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getPlayerCompleteMonthlyArchives(username: string, year: string | number, month: string | number, options?: object, callback?: Callback): Promise<RequestResponse>;
        getPlayerMultiGamePGN(username: string, year: string | number, month: string | number, options?: object, callback?: Callback): Promise<RequestResponse>;
        getPlayerClubs(username: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getPlayerMatches(username: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getPlayerTournaments(username: string, options?: object, callback?: Callback): Promise<RequestResponse>;

        // --- Games ---
        getGameByID(id: string, options?: object, callback?: Callback): Promise<RequestResponse>;

        // --- Clubs ---
        getClub(urlID: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getClubMembers(urlID: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getClubMatches(urlID: string, options?: object, callback?: Callback): Promise<RequestResponse>;

        // --- Tournaments ---
        getTournament(urlID: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getTournamentRound(urlID: string, round: string | number, options?: object, callback?: Callback): Promise<RequestResponse>;
        getTournamentRoundGroup(urlID: string, round: string | number, group: string | number, options?: object, callback?: Callback): Promise<RequestResponse>;

        // --- Team Matches ---
        getTeamMatch(id: string | number, options?: object, callback?: Callback): Promise<RequestResponse>;
        getTeamMatchBoard(id: string | number, board: string | number, options?: object, callback?: Callback): Promise<RequestResponse>;
        getTeamLiveMatch(id: string | number, options?: object, callback?: Callback): Promise<RequestResponse>;
        getTeamLiveMatchBoard(id: string | number, board: string | number, options?: object, callback?: Callback): Promise<RequestResponse>;

        // --- Countries ---
        getCountry(iso: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getCountryPlayers(iso: string, options?: object, callback?: Callback): Promise<RequestResponse>;
        getCountryClubs(iso: string, options?: object, callback?: Callback): Promise<RequestResponse>;

        // --- Daily Puzzle ---
        getDailyPuzzle(options?: object, callback?: Callback): Promise<RequestResponse>;
        getDailyPuzzleRandom(options?: object, callback?: Callback): Promise<RequestResponse>;

        // --- General ---
        getStreamers(options?: object, callback?: Callback): Promise<RequestResponse>;
        getLeaderboards(options?: object, callback?: Callback): Promise<RequestResponse>;
        getTitledPlayers(titleAbbrev: string, options?: object, callback?: Callback): Promise<RequestResponse>;

        // --- Priority Queue ---
        dispatch(
            method: Function,
            callback: (...args: any[]) => void,
            parameters?: any[],
            options?: object,
            callbackParameters?: any[],
            priority?: number
        ): void;

        clearQueue(): void;

        // --- Query for Changes ---
        ifChanged(
            etag: string,
            method: Function,
            parameters?: any[],
            options?: object,
            callback?: Callback
        ): Promise<{ changed: boolean; response?: RequestResponse }>;
    }
}
