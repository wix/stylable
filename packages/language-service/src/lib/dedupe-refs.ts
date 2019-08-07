import { Location } from 'vscode-languageserver-types';

export function dedupeRefs(refs: Location[]): Location[] {
    const res: Location[] = [];
    refs.forEach(ref => {
        if (
            !res.find(
                r =>
                    r.range.start.line === ref.range.start.line &&
                    r.range.start.character === ref.range.start.character &&
                    r.uri === ref.uri
            )
        ) {
            res.push(ref);
        }
    });
    return res;
}
