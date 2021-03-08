export function createLogger(prefix: string, shouldLog: boolean) {
    return function log(...messages: any[]) {
        if (shouldLog) {
            console.log(prefix, ...messages);
        }
    };
}
