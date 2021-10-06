import type { ResolveProjects, STCConfig } from './types';
import { INpmPackage, resolveDirectoryContext } from '@wixc3/resolve-directory-context';
import { asteriskMatch } from '../helpers';

export const resolveNpmProjects: ResolveProjects = (projectsEntries, { projectRoot }) => {
    const directoryContext = resolveDirectoryContext(projectRoot);

    if (directoryContext.type === 'single') {
        throw new Error(
            'Stylable CLI multiple project config default resolution does not support single package'
        );
    } else {
        const projects: STCConfig = [];
        const packages = directoryContext.packages.slice() as Array<INpmPackage | null>;

        for (const { request, options } of projectsEntries) {
            let foundMatch = false;
            for (let i = 0; i < packages.length; i++) {
                const pkg = packages[i];

                if (!pkg) {
                    continue;
                }

                if (asteriskMatch(request, pkg.displayName)) {
                    foundMatch = true;
                    packages[i] = null;
                    projects.push({ projectRoot: pkg.directoryPath, options });
                }
            }

            if (!foundMatch) {
                throw new Error(`Stylable CLI could not resolve project named "${request}"`);
            }
        }

        return projects;
    }
};
