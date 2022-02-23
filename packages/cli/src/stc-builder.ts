import { nodeFs } from '@file-services/node';
import { buildStylable } from './build-stylable';
import { DiagnosticsManager } from './diagnostics-manager';
import { createWatchEvent } from './directory-process-service/directory-process-service';
import { createLogger } from './logger';
import type { DiagnosticMessages } from './report-diagnostics';
import type { STCProjects } from './types';
import type { WatchHandler } from './watch-handler';

const { existsSync, realpathSync, join } = nodeFs;

export class STCBuilder {
    private diagnosticsManager: DiagnosticsManager;
    public watchHandler: WatchHandler | undefined;
    public outputFiles: Map<string, Set<string>> | undefined;
    public diagnosticsMessages: DiagnosticMessages = new Map();
    public projects: STCProjects | undefined;

    constructor(private rootDir: string, private configFilePath?: string) {
        this.diagnosticsManager = new DiagnosticsManager({
            log: createNoopLogger(),
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
                'Stylable Builder Error: handleWatchedFiles called before watchHandler is set, did you run build?'
            );
        }

        for (const filePath of modifiedFiles) {
            const event = createWatchEvent(
                existsSync(filePath) ? realpathSync(filePath) : filePath
            );

            await this.watchHandler.listener(event);
        }
    };

    public build = async (watchMode?: boolean) => {
        const buildOutput = await buildStylable(this.rootDir, {
            diagnosticsManager: this.diagnosticsManager,
            log: createNoopLogger(),
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
                sourcesPaths.add(join(projectRoot, optionEntity.srcDir));
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
