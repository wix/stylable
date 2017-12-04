import { FileProcessor, MinimalFS } from './cached-process-file';
import { Diagnostics } from './diagnostics';
import { StylableMeta } from './stylable-processor';
import { StylableTransformer } from './stylable-transformer';
import { RuntimeStylesheet } from './types';
export declare function createGenerator(fs?: MinimalFS, requireModule?: (moduleId: string) => any, delimiter?: string): {
    fileProcessor: FileProcessor<StylableMeta>;
    delimiter: string;
    scope: (name: string, namespace: string, delimiter?: string) => string;
    fromCSS(source: string, path?: string): {
        meta: StylableMeta;
        transformer: StylableTransformer;
        diagnostics: Diagnostics;
        runtime: RuntimeStylesheet;
    };
    fromFile(path: string): {
        meta: StylableMeta;
        transformer: StylableTransformer;
        diagnostics: Diagnostics;
        runtime: RuntimeStylesheet;
    };
};
