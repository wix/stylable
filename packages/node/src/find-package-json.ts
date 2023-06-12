import fs from 'fs';
import { dirname, join } from 'path';

export function findPackageJson(
    cwd: string,
    cache = new Map<string, string>(),
    visited: string[] = []
) {
    while (cwd) {
        if (cache.has(cwd)) {
            return {
                packageJsonPath: cache.get(cwd),
                visited,
                cache,
            };
        }

        const packageJsonPath = join(cwd, 'package.json');
        visited.push(cwd);
        if (fs.existsSync(packageJsonPath)) {
            for (const dir of visited) {
                cache.set(dir, packageJsonPath);
            }
            return {
                packageJsonPath,
                visited,
                cache,
            };
        } else {
            const parent = dirname(cwd);
            if (parent === cwd) {
                return null;
            }
            cwd = parent;
        }
    }
    return null;
}
