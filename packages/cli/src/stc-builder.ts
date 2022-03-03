import { nodeFs } from '@file-services/node';
import { buildStylable } from './build-stylable';
import { DiagnosticsManager } from './diagnostics-manager';
import { createWatchEvent } from './directory-process-service/directory-process-service';
import { createLogger, Log } from './logger';
import type { IFileSystem } from '@file-services/types';
import type { DiagnosticMessages } from './report-diagnostics';
import type { STCProjects } from './types';
import type { WatchHandler } from './watch-handler';

export type STCBuilderFileSystem = Pick<IFileSystem, 'existsSync' | 'realpathSync' | 'join'>;

export interface STCBuilderOptions {
    rootDir: string;
    configFilePath?: string;
    log?: Log;
    fs?: STCBuilderFileSystem;
}

export class STCBuilder {
    private diagnosticsManager: DiagnosticsManager;
    public watchHandler: WatchHandler | undefined;
    public outputFiles: Map<string, Set<string>> | undefined;
    public diagnosticsMessages: DiagnosticMessages = new Map();
    public projects: STCProjects | undefined;

    static create({
        rootDir,
        configFilePath,
        log = createNoopLogger(),
        fs = nodeFs,
    }: STCBuilderOptions) {
        return new this(rootDir, configFilePath, log, fs);
    }

    private constructor(
        private rootDir: string,
        private configFilePath?: string,
        private log = createNoopLogger(),
        private fs: STCBuilderFileSystem = nodeFs
    ) {
        this.diagnosticsManager = new DiagnosticsManager({
            log: this.log,
            hooks: {
                preReport: (diagnosticsMessages) => {
                    this.diagnosticsMessages = diagnosticsMessages;
                },
            },
        });
    }

    public handleWatchedFiles = async (modifiedFiles: Iterable<string>) => {
        if (!this.watchHandler) {
            throw new Error(
                'Stylable Builder Error: handleWatchedFiles called before watchHandler is set, did you run build()?'
            );
        }

        for (const filePath of modifiedFiles) {
            const event = createWatchEvent(
                this.fs.existsSync(filePath) ? this.fs.realpathSync(filePath) : filePath
            );

            await this.watchHandler.listener(event);
        }
    };

    public build = async (watchMode?: boolean) => {
        const buildOutput = await buildStylable(this.rootDir, {
            diagnosticsManager: this.diagnosticsManager,
            log: this.log,
            configFilePath: this.configFilePath,
            watchMode,
        });

        this.watchHandler = buildOutput.watchHandler;
        this.outputFiles = buildOutput.outputFiles;
        this.projects = buildOutput.projects;
    };

    public getProjectsSources = () => {
        if (!this.projects) {
            throw new Error(
                'Stylable Builder Error: Can not get projects sources when projects is undefined, did you run build()?'
            );
        }

        const sourcesPaths = new Set<string>();

        for (const { projectRoot, options } of this.projects) {
            for (const optionEntity of options) {
                sourcesPaths.add(this.fs.join(projectRoot, optionEntity.srcDir));
            }
        }

        return sourcesPaths;
    };
}

function createNoopLogger() {
    return createLogger(
        () => {
            return;
        },
        () => {
            return;
        }
    );
}
