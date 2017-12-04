import { FileProcessor, MinimalFS } from './cached-process-file';
import { StylableMeta } from './stylable-processor';
export interface StylableInfrastructure {
    fileProcessor: FileProcessor<StylableMeta>;
    resolvePath: (context: string, path: string) => string;
}
export declare function createInfrastructure(projectRoot: string, fileSystem: MinimalFS, onProcess?: (meta: StylableMeta, path: string) => StylableMeta): StylableInfrastructure;
