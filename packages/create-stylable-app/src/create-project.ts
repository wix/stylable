import path from 'path';
import { promises } from 'fs';
import { SpawnOptions } from 'child_process';
import validatePackageName from 'validate-npm-package-name';
import { statSafe, spawnSafe, directoryDeepChildren, executeWithProgress } from './helpers';

const templateDefinitionFileName = 'template.js';

/** @example ['npm', 'install', 'react'] */
export type TemplateCommand = string[];

export interface TemplateDefinition {
    /** npm dependencies to install using `npm i` */
    dependencies?: string[];
    /** npm dev dependencies to install using `npm i -D` */
    devDependencies?: string[];
    /** keys to override on package json */
    packageJson?: Record<string, unknown>;
    /** extra commands to execute */
    postinstall?: TemplateCommand[];
}

export interface CreateProjectFromTemplateOptions {
    /** Absolute path to project template directory */
    templatePath: string;
    /** Absolute path to directory where new project will be created. Should not exist or be empty. */
    targetDirectoryPath: string;
    /** Print output of commands being executed */
    verbose?: boolean;
}

export async function createProjectFromTemplate({
    targetDirectoryPath,
    templatePath,
    verbose = false,
}: CreateProjectFromTemplateOptions) {
    const templateDefinitionPath = path.join(templatePath, templateDefinitionFileName);

    const { dependencies, devDependencies, packageJson, postinstall } = (await import(
        templateDefinitionPath
    )) as TemplateDefinition;

    // package name validation
    const targetDirectoryName = path.basename(targetDirectoryPath);
    const validationResult = validatePackageName(targetDirectoryName);
    if (!validationResult.validForNewPackages) {
        console.error(`[!] "${targetDirectoryName}" is not a valid npm package name:`);
        const namingIssues = [
            ...('errors' in validationResult ? validationResult.errors : []),
            ...('warnings' in validationResult ? validationResult.warnings : []),
        ];
        for (const namingIssue of namingIssues) {
            console.error(` - ${namingIssue}`);
        }
        return;
    }

    // project directory creation
    const directoryStats = await statSafe(targetDirectoryPath);
    if (directoryStats) {
        if (!directoryStats.isDirectory()) {
            console.error(`[!] ${targetDirectoryPath} already exists and is not a directory.`);
            return;
        } else if ((await promises.readdir(targetDirectoryPath)).length) {
            console.error(`[!] ${targetDirectoryPath} exists and is not empty.`);
            return;
        }
    } else {
        await promises.mkdir(targetDirectoryPath, { recursive: true });
    }

    const spawnOptions: SpawnOptions = { cwd: targetDirectoryPath, shell: true };
    if (verbose) {
        spawnOptions.stdio = 'inherit';
    }

    console.log(`# Initializing "${targetDirectoryName}" at ${targetDirectoryPath}`);
    await spawnSafe('npm', ['init', '-y'], spawnOptions);

    console.log(`# Populating project with template files.`);
    for await (const item of directoryDeepChildren(templatePath)) {
        const targetItemPath = path.join(targetDirectoryPath, item.relativePath);
        if (item.type === 'directory') {
            const directoryStats = await statSafe(targetItemPath);
            if (!directoryStats) {
                await promises.mkdir(targetItemPath, { recursive: true });
            }
        } else if (item.type === 'file' && item.path !== templateDefinitionPath) {
            await promises.copyFile(item.path, targetItemPath);
        }
    }

    // package.json overrides
    if (packageJson) {
        const packageJsonPath = path.join(targetDirectoryPath, 'package.json');
        const originalPackageJson = JSON.parse(
            await promises.readFile(packageJsonPath, { encoding: 'utf8' })
        ) as object;

        const packageJsonWithOverrides = { ...originalPackageJson, ...packageJson };
        await promises.writeFile(
            packageJsonPath,
            `${JSON.stringify(packageJsonWithOverrides, null, 2)}\n`
        );
    }

    const progressDotInterval = verbose ? 0 : 5000;

    await executeWithProgress(
        `# Fetching latest .gitignore from GitHub.`,
        () => spawnSafe('npx', ['gitignore', 'node'], spawnOptions),
        progressDotInterval
    );

    if (dependencies?.length) {
        await executeWithProgress(
            `# Installing dependencies.`,
            () => spawnSafe('npm', ['install', ...dependencies], spawnOptions),
            progressDotInterval
        );
    }

    if (devDependencies?.length) {
        await executeWithProgress(
            `# Installing devDependencies.`,
            () => spawnSafe('npm', ['install', '-D', ...devDependencies], spawnOptions),
            progressDotInterval
        );
    }

    if (postinstall?.length) {
        await executeWithProgress(
            `# Running postinstall template commands.`,
            async () => {
                for (const [command, ...params] of postinstall) {
                    await spawnSafe(command, params, spawnOptions);
                }
            },
            progressDotInterval
        );
    }

    console.log(`# Done. Project "${targetDirectoryName}" is ready.`);
}
