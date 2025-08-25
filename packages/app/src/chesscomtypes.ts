export interface ChessGamePlayer {
    "@id"?: string
    username: string
    rating: number
    result: string
    uuid?: string
}

export interface ChessGame {
    black: ChessGamePlayer
    white: ChessGamePlayer

    eco?: string
    end_time?: number
    fen: string
    initial_setup?: string
    pgn: string
    rated: boolean
    rules?: string
    tcn?: string
    time_class?: string
    time_control?: string
    url?: string
    uuid?: string
}