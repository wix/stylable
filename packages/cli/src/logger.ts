export const levels = {
    debug: Symbol('debug'),
    info: Symbol('info'),
    clear: Symbol('clear'),
};

export function createLogger(
    onLog: (level: 'info' | 'debug', ...messages: string[]) => void,
    onClear: () => void
) {
    return function log(...messages: any[]) {
        const clear = messages[messages.length - 1] === levels.clear;
        if (clear) {
            onClear();
            return;
        }

        const info = messages[messages.length - 1] === levels.info;
        const debug = messages[messages.length - 1] === levels.debug;
        if (info || debug) {
            messages.pop();
        }

        onLog(info ? 'info' : 'debug', ...messages);
    };
}

export type Log = (...args: [...any[]]) => void;

export function createDefaultLogger() {
    return createLogger(
        (level, ...messages) => level === 'info' && console.log(...messages),
        console.clear
    );
}
