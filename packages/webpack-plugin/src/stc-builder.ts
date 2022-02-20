import { loadStylableConfig } from '@stylable/build-tools';
import {
    buildStylable,
    createLogger,
    createWatchEvent,
    DiagnosticsManager,
    WatchHandler,
} from '@stylable/cli';
import type { DiagnosticMessages } from '@stylable/cli/dist/report-diagnostics';
import { realpathSync } from 'fs';
import { dirname } from 'path';
import type { Compiler } from 'webpack';

export class STCBuilder {
    private diagnosticsManager: DiagnosticsManager;
    private watchHandler: WatchHandler | undefined;
    private rootDir: string | undefined;
    public config: { path: string; config: any } | undefined;
    public outputFiles: Map<string, Set<string>> | undefined;
    public diagnosticsMessages: DiagnosticMessages = new Map();

    constructor(private compiler: Compiler) {
        this.config = loadStylableConfig(this.compiler.context, (c) => c);
        this.rootDir ??= this.config?.path ? dirname(this.config.path) : undefined;
        this.diagnosticsManager = new DiagnosticsManager({
            log: createNoopLogger(),
            hooks: {
                preReport: (diagnosticsMessages) => {
                    this.diagnosticsMessages = diagnosticsMessages;
                },
            },
        });
    }

    public build = async () => {
        if (!this.config || !this.rootDir) {
            throw new Error(
                'Stylable Builder Error: can not build when config or rootDir is undefined'
            );
        }

        if (this.watchHandler) {
            if (this.compiler.modifiedFiles) {
                for (const filePath of this.compiler.modifiedFiles) {
                    const file = createWatchEvent(realpathSync(filePath));
                    await this.watchHandler.listener(file);
                }
            }
        } else {
            const buildOutput = await buildStylable(this.rootDir, {
                diagnosticsManager: this.diagnosticsManager,
                log: createNoopLogger(),
            });

            this.watchHandler = buildOutput.watchHandler;
            this.outputFiles = buildOutput.outputFiles;
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
