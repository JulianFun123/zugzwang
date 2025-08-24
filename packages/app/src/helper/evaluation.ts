import {cpToPercent} from "@/helper/stockfish.ts";
import {openings} from "@/data/openings.ts";

export type MoveEvaluation = 'blunder' | 'mistake' | 'inaccuracy' | 'good' | 'excellent' | 'book' | 'okay';

export function evaluateMove(previousEvaluation: number | null, currentEvaluation: number | null, isWhite: boolean, fen: string): MoveEvaluation | null {
    if (previousEvaluation === null || currentEvaluation === null) {
        return null;
    }

    const [f] = fen.split(' ');
    if (openings.find(e => f === e.fen)) {
        return 'book';
    }

    const evalDiff = (cpToPercent(currentEvaluation) - cpToPercent(previousEvaluation)) * (isWhite ? 1 : -1);

    if (evalDiff <= -20) {
        return 'blunder';
    } else if (evalDiff <= -10) {
        return 'mistake';
    } else if (evalDiff <= -5) {
        return 'inaccuracy';
    } else if (evalDiff <= -2) {
        return 'okay';
    } else if (evalDiff >= 20) {
        return 'excellent';
    } else if (evalDiff >= 5) {
        return 'good';
    } else {
        return null;
    }
}