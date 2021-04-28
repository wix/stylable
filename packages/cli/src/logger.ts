export const levels = {
    debug: Symbol('debug'),
    info: Symbol('info'),
};

export function createLogger(prefix: string, shouldLog: boolean) {
    return function log(...messages: any[]) {
        const info = messages[messages.length - 1] === levels.info;
        const debug = messages[messages.length - 1] === levels.debug;
        if (info || debug) {
            messages.pop();
        }
        if (shouldLog || info) {
            console.log(prefix, ...messages);
        }
    };
}
