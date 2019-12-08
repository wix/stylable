import camelcase from 'lodash.camelcase';
import upperfirst from 'lodash.upperfirst';
import { basename } from 'path';

function filename2varname(filePath: string) {
    const varname = basename(basename(filePath, '.css'), '.st') // remove prefixes
        .replace(/^\d+/, ''); // remove leading numbers
    return upperfirst(camelcase(varname));
}

export class Generator {
    public generateImport(filePath: string) {
        return {
            default: filename2varname(filePath)
        };
    }
}
