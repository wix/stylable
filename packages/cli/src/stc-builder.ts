import { nodeFs } from '@file-services/node';
import { buildStylable } from './build-stylable';
import { DiagnosticsManager } from './diagnostics-manager';
import { createWatchEvent } from './directory-process-service/directory-process-service';
import { createLogger, Log } from './logger';
import type { IFileSystem } from '@file-services/types';
import type { DiagnosticMessages } from './report-diagnostics';
import type { STCProjects } from './types';
import type { WatchHandler } from './watch-handler';
import {
    DiagnosticsMode,
    EmitDiagnosticsContext,
    reportDiagnostic,
} from '@stylable/core/dist/index-internal';

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
};

export class STCBuilder {
    private diagnosticsManager: DiagnosticsManager;
    private outputFiles: Map<string, Set<string>> | undefined;
    private diagnosticsMessages: DiagnosticMessages = new Map();
    private watchHandler: WatchHandler | undefined;
    private projects: STCProjects | undefined;

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
                    this.diagnosticsMessages = new Map(diagnosticsMessages);
                },
            },
        });
    }

    /**
     * Provide the sources files for given output file path.
     * @param outputFilePath {string}
     */
    public getSourcesFiles = (outputFilePath: string) => {
        return this.outputFiles?.get(outputFilePath);
    };

    /**
     * Executes a rebuild. It will build all files if "build" was never called or perform a rebuild of provided modified files.
     * Stylable saves information about the files that were built in each execution, then this can be used to rebuild only the relevant files.
     *
     * @param modifiedFiles {Iterable<string>} list of absolute file path that have been modified since the last build execution.
     */
    public rebuild = async (modifiedFiles: Iterable<string> = []): Promise<void> => {
        if (this.watchHandler) {
            return this.rebuildModifiedFiles(modifiedFiles);
        } else {
            return this.build();
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
            watch: this.watchMode,
            watchOptions: {
                lazy: true,
            },
        });

        this.watchHandler = buildOutput.watchHandler;
        this.outputFiles = buildOutput.outputFiles;
        this.projects = buildOutput.projects;
    };

    /**
     * Returns the absolute paths of the source directory that were resolved in the last build execution.
     * @returns {Iterable<string>} list of absolute directory path of the Stylable projects.
     */
    public getProjectsSources = (): Iterable<string> => {
        const sourcesPaths = new Set<string>();

        if (!this.projects) {
            return sourcesPaths;
        }

        for (const { projectRoot, options } of this.projects) {
            for (const optionEntity of options) {
                sourcesPaths.add(this.fs.join(projectRoot, optionEntity.srcDir));
            }
        }

        return sourcesPaths;
    };

    /**
     * Reports diagnostics messages aggregated from the last build execution.
     * @param context {EmitDiagnosticsContext}
     * @param diagnosticsMode {DiagnosticsMode}
     */
    public reportDiagnostics = (
        context: EmitDiagnosticsContext,
        diagnosticsMode: DiagnosticsMode,
        remove = false
    ) => {
        for (const [filePath] of this.diagnosticsMessages.entries()) {
            this.reportDiagnostic(filePath, context, diagnosticsMode, remove);
        }
    };

    /**
     * Reports diagnostics messages for a given file from the last build execution.
     * @param filePath {string}
     * @param context {EmitDiagnosticsContext}
     * @param diagnosticsMode {DiagnosticsMode}
     */
    public reportDiagnostic = (
        filePath: string,
        context: EmitDiagnosticsContext,
        diagnosticsMode: DiagnosticsMode,
        remove = false
    ) => {
        const diagnostics = this.diagnosticsMessages.get(filePath);

        if (!diagnostics) {
            return;
        }

        for (const diagnostic of diagnostics) {
            reportDiagnostic(
                context,
                diagnosticsMode,
                diagnostic,
                `${filePath}${
                    diagnostic.line && diagnostic.column
                        ? `:${diagnostic.line}:${diagnostic.column}`
                        : ''
                }`
            );
        }

        if (remove) {
            this.diagnosticsMessages.delete(filePath);
        }
    };

    /**
     * Executes an incremental build of modified files.
     * @param modifiedFiles {Iterable<string>} list of absolute file path that have been modified since the last build execution.
     */
    private rebuildModifiedFiles = async (modifiedFiles: Iterable<string>) => {
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
