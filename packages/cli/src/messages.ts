export const processMessages = {
    START_WATCHING() {
        return 'Start watching...';
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
    CHANGE_DETECTED(location: string) {
        return `Change detected at "${location}".`;
    },
    WATCH_SUMMARY(changes: number, deleted: number) {
        return `Found ${changes} changes and ${deleted} deletions.`;
    },
};
