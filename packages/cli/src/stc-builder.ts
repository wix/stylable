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
    watchMode?: boolean;
}

const diagnostics = {
    INVALID_WATCH_HANDLER(method: string) {
        return `"${method}" called before the watchHandler is set, did you run build()?`;
    },
    INVALID_PROJECTS_SOURCES() {
        return 'Can not get projects sources, did you run build()?';
    },
};

export class STCBuilder {
    private diagnosticsManager: DiagnosticsManager;
    public watchHandler: WatchHandler | undefined;
    public outputFiles: Map<string, Set<string>> | undefined;
    public diagnosticsMessages: DiagnosticMessages = new Map();
    public projects: STCProjects | undefined;

    static create({
        rootDir,
        fs = nodeFs,
        configFilePath,
        log = createNoopLogger(),
        watchMode = false,
    }: STCBuilderOptions) {
        return new this(rootDir, fs, configFilePath, log, watchMode);
    }

    private constructor(
        private rootDir: string,
        private fs: STCBuilderFileSystem,
        private configFilePath?: string,
        private log?: Log,
        private watchMode?: boolean
    ) {
        this.diagnosticsManager = new DiagnosticsManager({
            log: this.log,
            hooks: {
                preReport: (diagnosticsMessages) => {
                    /**
                     * Update the diagnostics messages every `build` execution.
                     */
                    this.diagnosticsMessages = diagnosticsMessages;
                },
            },
        });
    }

    /**
     * Executes an incremental build of modified files.
     * Stylable saves information about the files that were built in each execution, then this can be used to rebuild only the relevant files.
     * @param modifiedFiles {Iterable<string>} list of absolute file path that have been modified since the last build execution.
     */
    public rebuildModifiedFiles = async (modifiedFiles: Iterable<string>) => {
        if (!this.watchHandler) {
            throw createSTCBuilderError(diagnostics.INVALID_WATCH_HANDLER('handleWatchedFiles'));
        }

        for (const filePath of modifiedFiles) {
            const event = createWatchEvent(
                this.fs.existsSync(filePath) ? this.fs.realpathSync(filePath) : filePath
            );

            await this.watchHandler.listener(event);
        }
    };

    /**
     * Executes a fresh build of the Stylable project.
     */
    public build = async () => {
        const buildOutput = await buildStylable(this.rootDir, {
            diagnosticsManager: this.diagnosticsManager,
            log: this.log,
            configFilePath: this.configFilePath,
            watchMode: this.watchMode,
        });

        this.watchHandler = buildOutput.watchHandler;
        this.outputFiles = buildOutput.outputFiles;
        this.projects = buildOutput.projects;
    };

    public getProjectsSources = () => {
        if (!this.projects) {
            throw createSTCBuilderError(diagnostics.INVALID_PROJECTS_SOURCES());
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

function createSTCBuilderError(message: string) {
    return new Error(`Stylable Builder Error: ${message}`);
}
