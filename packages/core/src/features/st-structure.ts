import { plugableRecord } from '../helpers/plugable-record';
import { createFeature } from './feature';
import { warnOnce } from '../helpers/deprecation';

export const diagnostics = {
    // UNEXPECTED_DECL_VALUE: createDiagnosticReporter(
    //     '00000',
    //     'error',
    //     (value: string) => `unexpected value: ${value}`
    // ),
};
export const experimentalMsg = '[experimental feature] stylable structure (@st): API might change!';

const dataKey = plugableRecord.key<{}>('st-structure');

// HOOKS
export const hooks = createFeature({
    metaInit({ meta }) {
        plugableRecord.set(meta.data, dataKey, {});
    },
    analyzeAtRule() {
        warnOnce(experimentalMsg);
    },
});
