export function createDeferred() {
    let out = {} as {
        promise: Promise<void>;
        resolve: () => void;
        reject: (reason?: any) => void;
    }
    out.promise = new Promise<void>((res, rej) => {
        out.resolve = res;
        out.reject = rej;
    });
    return out;
}