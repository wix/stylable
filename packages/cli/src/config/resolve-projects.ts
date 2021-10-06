import {
    INpmPackage,
    resolveWorkspacePackages,
    sortPackagesByDepth,
} from '@wixc3/resolve-directory-context';
import type { RawProjectEntry, ResolveProjects } from './types';

export const resolveNpmProjects: ResolveProjects = (projectsEntries, { projectRoot }) => {
    const projectEntriesMap = new Map<string, RawProjectEntry>();
    const packagesSet = new Set<INpmPackage>();

    for (const entry of projectsEntries) {
        const { request } = entry;
        const packages = sortPackagesByDepth(resolveWorkspacePackages(projectRoot, [request]));

        for (const pkg of packages) {
            const previousEntry = projectEntriesMap.get(pkg.displayName)!;

            if (previousEntry) {
                if (previousEntry.request === request) {
                    throw new Error(
                        'Stylable CLI config can not have a duplicate project requests'
                    );
                } else {
                    continue;
                }
            }

            projectEntriesMap.set(pkg.displayName, entry);
            packagesSet.add(pkg);
        }
    }

    const packages = Array.from(packagesSet).map((pkg) => ({
        projectRoot: pkg.directoryPath,
        options: projectEntriesMap.get(pkg.displayName)!.options,
    }));

    return packages;
};
