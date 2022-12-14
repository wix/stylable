export const buildMessages = {
    EMIT_BUNDLE(filePath: string, fileCount: number) {
        return `Emitting bundle to "${filePath}" contains ${fileCount} files.`;
    },
    START_WATCHING() {
        return 'Start watching...';
    },
    STOP_WATCHING() {
        return 'Stop watching.';
    },
    CONTINUE_WATCH() {
        return `Watching files...`;
    },
    FINISHED_PROCESSING(count: number, location?: string) {
        return `Finished processing ${count} ${count === 1 ? 'file' : 'files'}${
            location ? ` in "${location}"` : ''
        }.`;
    },
    BUILD_PROCESS_INFO(location: string) {
        return `Processing files of "${location}"`;
    },
    BUILD_SKIPPED(identifier?: string) {
        return `No stylable files found. build skipped${identifier ? ` for "${identifier}"` : ''}.`;
    },
    SKIP_GENERATED_FILE(location: string) {
        return `Skipping generated file build of "${location}".`;
    },
    CHANGE_EVENT_TRIGGERED(location: string) {
        return `Change event triggered for "${location}".`;
    },
    CHANGE_DETECTED(location: string) {
        return `Change detected at "${location}". Start Processing...`;
    },
    WATCH_SUMMARY(changes: number, deleted: number) {
        return `Processed ${changes} changes and ${deleted} deletions.`;
    },
    NO_DIAGNOSTICS() {
        return `Found 0 diagnostics.`;
    },
};

export const errorMessages = {
    STYLABLE_PROCESS(filePath: string) {
        return `Stylable failed to process "${filePath}"`;
    },
};
