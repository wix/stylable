import {
    INpmPackage,
    resolveWorkspacePackages,
    sortPackagesByDepth,
} from '@wixc3/resolve-directory-context';
import type { RawProjectEntity, ResolveProjects } from '../types';

export const resolveNpmProjects: ResolveProjects = (projectsEntities, { projectRoot }) => {
    const projectEntriesMap = new Map<string, RawProjectEntity>();
    const packages = new Set<INpmPackage>();

    for (const entity of projectsEntities) {
        const { request } = entity;
        const workspacePackages = sortPackagesByDepth(
            resolveWorkspacePackages(projectRoot, [request])
        );

        if (!workspacePackages.length) {
            throw new Error(`Stylable CLI config can not resolve project request "${request}"`);
        }

        for (const pkg of workspacePackages) {
            const previousEntry = projectEntriesMap.get(pkg.displayName);

            if (previousEntry) {
                if (previousEntry.request === request) {
                    throw new Error(
                        'Stylable CLI config can not have a duplicate project requests'
                    );
                }
            } else {
                packages.add(pkg);
            }

            projectEntriesMap.set(pkg.displayName, entity);
        }
    }

    return Array.from(packages).map((pkg) => ({
        projectRoot: pkg.directoryPath,
        options: projectEntriesMap.get(pkg.displayName)!.options,
    }));
};
