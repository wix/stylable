export const messages = {
    START_WATCHING() {
        return 'start watching...';
    },
    FINISHED_PROCESSING(count: number, location?: string) {
        return `finished processing ${count} ${count === 1 ? 'file' : 'files'}${
            location ? ` in "${location}"` : ''
        }.`;
    },
    BUILD_SKIPPED(identifier?: string) {
        return `No stylable files found. build skipped${identifier ? ` for "${identifier}"` : ''}.`;
    },
};
