export type StateValue = boolean | number | string;

export interface StateMap {
    [stateName: string]: StateValue;
}

export interface CompatStylesheet {
    $cssStates(states?: StateMap | null): { className: string };
}
export interface LegacyStylesheet {
    $cssStates(states?: StateMap | null): StateMap;
}

export interface StylesheetV2 {
    cssStates(states?: StateMap | null): string;
}

export type CommonStylesheet = LegacyStylesheet | CompatStylesheet | StylesheetV2;

export function getStylesheetMode(sheet: any) {
    if (sheet.$cssStates) {
        const res = typeof sheet.$cssStates === 'function' ? sheet.$cssStates({}) : {};
        if (res.hasOwnProperty('className')) {
            return 'compat';
        } else {
            return 'legacy';
        }
    } else {
        return 'v2';
    }
}
