import {createDeferred} from "@/helper/deferred.ts";

export type Cp = { type: 'cp', cp: number, value: number, pv: string[] }
export type Mate = {mate: number, cp: number, type: 'mate', pv: string[]}

export let sf: Worker;
export const stockfishLoaded = createDeferred()

export const initStockfish = async () => {

    sf = new Worker(new URL('/assets/engines/stockfish-17/stockfish-17-lite.js?url', import.meta.url))

    //sf.addEventListener('message', m => console.log('sf', m.data))
    await sfWaitFor('uci', m => m === 'uciok')
    await sfWaitFor('isready', m => m === 'readyok')
    sf.postMessage('setoption name Threads value 5')
    stockfishLoaded.resolve?.()
}

export const cpToPercent = (cp: number) => {
    return Math.max(0, Math.min(100, 50 + cp / 20))
}

export const sfWaitFor = (sendmsg: string, checker: (str: string) => boolean) => {
    return new Promise<string>((resolve) => {
        const handler = (e: MessageEvent) => {
            if (checker(e.data)) {
                sf.removeEventListener('message', handler)
                resolve(e.data)
            }
        }
        sf.addEventListener('message', handler)
        sf.postMessage(sendmsg)
    })
}


export function parseStockfishLine(line: string, invertNumbers = false): Cp|Mate|null {
    let result: Cp|Mate|null = null;

    // Match evaluation (centipawns or mate)
    const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
    if (scoreMatch) {
        if (scoreMatch[1] === "cp") {
            const cp = parseInt(scoreMatch[2], 10)
            result = {
                type: 'cp',
                cp,
                value: cp / 100,
                pv: []
            }
        } else if (scoreMatch[1] === "mate") {
            const mate = parseInt(scoreMatch[2], 10);
            result = {
                type: 'mate',
                mate,
                cp: mate > 0 ? 500000 : -500000,
                pv: []
            }
        }
        if (invertNumbers && result) {
            result.cp = -result.cp;
        }

    }
    // Match principal variation
    const pvMatch = line.match(/ pv (.+)/);
    if (pvMatch && result) {
        result.pv = pvMatch[1].split(" ");
    }

    return result;
}