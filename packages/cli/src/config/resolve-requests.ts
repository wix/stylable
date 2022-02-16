import fs from '@file-services/node';
import {
    INpmPackage,
    resolveWorkspacePackages,
    sortPackagesByDepth,
} from '@wixc3/resolve-directory-context';
import type { RawProjectEntity, ResolveRequests } from '../types';

export const resolveNpmRequests: ResolveRequests = (entities, { rootDir }) => {
    const entitiesMap = new Map<string, RawProjectEntity>();
    const packages = new Set<INpmPackage>();

    for (const entity of entities) {
        const { request } = entity;
        const workspacePackages = resolveWorkspacePackages(rootDir, [request], fs);

        if (!workspacePackages.length) {
            throw new Error(`Stylable CLI config can not resolve project request "${request}"`);
        }

        for (const pkg of workspacePackages) {
            const existingEntity = entitiesMap.get(pkg.displayName);

            // adding the npm package once to keep the original package order and to avoid duplicates
            if (existingEntity) {
                // validate duplicate requests, e.g. "packages/*" twice
                if (existingEntity.request === request) {
                    throw new Error(
                        `Stylable CLI config can not have a duplicate project requests "${request}".`
                    );
                }
            } else {
                packages.add(pkg);
            }

            // adding to entities map and overriding the correct package's entity if exists
            entitiesMap.set(pkg.displayName, entity);
        }
    }

    return sortPackagesByDepth(Array.from(packages)).map((pkg) => ({
        projectRoot: pkg.directoryPath,
        options: entitiesMap.get(pkg.displayName)!.options,
    }));
};
