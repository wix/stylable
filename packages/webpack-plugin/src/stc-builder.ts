import {
    buildStylable,
    createLogger,
    createWatchEvent,
    DiagnosticsManager,
    STCProjects,
    WatchHandler,
} from '@stylable/cli';
import type { DiagnosticMessages } from '@stylable/cli/dist/report-diagnostics';
import { existsSync, realpathSync } from 'fs';
import { join } from 'path';

export class STCBuilder {
    private diagnosticsManager: DiagnosticsManager;
    private watchHandler: WatchHandler | undefined;
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

    public build = async (modifiedFiles?: Iterable<string>) => {
        if (this.watchHandler) {
            if (modifiedFiles) {
                for (const filePath of modifiedFiles) {
                    const event = createWatchEvent(
                        existsSync(filePath) ? realpathSync(filePath) : filePath
                    );

                    await this.watchHandler.listener(event);
                }
            }
        } else {
            const buildOutput = await buildStylable(this.rootDir, {
                diagnosticsManager: this.diagnosticsManager,
                log: createNoopLogger(),
                configFilePath: this.configFilePath,
            });

            this.watchHandler = buildOutput.watchHandler;
            this.outputFiles = buildOutput.outputFiles;
            this.projects = buildOutput.projects;
        }
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
