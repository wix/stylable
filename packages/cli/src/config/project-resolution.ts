import { resolveDirectoryContext } from '@wixc3/resolve-directory-context';
import type { ResolveProjects } from './types';

export const resolveNpmProjects: ResolveProjects = (projectsMap, { projectRoot }) => {
    const directoryContext = resolveDirectoryContext(projectRoot);

    if (directoryContext.type === 'single') {
        throw new Error(
            'Stylable CLI multiple project config default resolution does not support single package'
        );
    } else {
        const projects = directoryContext.packages
            .filter((pkg) => projectsMap.has(pkg.displayName))
            .map((pkg) => ({
                displayName: pkg.displayName,
                projectRoot: pkg.directoryPath,
                options: projectsMap.get(pkg.displayName)!,
            }));

        if (projectsMap.size !== projects.length) {
            for (const [packageName] of projectsMap) {
                if (!projects.some((project) => project.displayName === packageName)) {
                    throw new Error(
                        `Stylable CLI default resolution could not find package named "${packageName}"`
                    );
                }
            }
        }

        return projects;
    }
};
