import {
    INpmPackage,
    resolveWorkspacePackages,
    sortPackagesByDepth,
} from '@wixc3/resolve-directory-context';
import type { RawProjectEntity, ResolveProjects } from '../types';

export const resolveNpmProjects: ResolveProjects = (projectsEntities, { projectRoot }) => {
    const projectEntriesMap = new Map<string, RawProjectEntity>();
    const packagesSet = new Set<INpmPackage>();

    for (const entity of projectsEntities) {
        const { request } = entity;
        const packages = sortPackagesByDepth(resolveWorkspacePackages(projectRoot, [request]));

        for (const pkg of packages) {
            const previousEntry = projectEntriesMap.get(pkg.displayName);

            if (previousEntry) {
                if (previousEntry.request === request) {
                    throw new Error(
                        'Stylable CLI config can not have a duplicate project requests'
                    );
                } else {
                    continue;
                }
            }

            projectEntriesMap.set(pkg.displayName, entity);
            packagesSet.add(pkg);
        }
    }

    const packages = Array.from(packagesSet).map((pkg) => ({
        projectRoot: pkg.directoryPath,
        options: projectEntriesMap.get(pkg.displayName)!.options,
    }));

    return packages;
};
