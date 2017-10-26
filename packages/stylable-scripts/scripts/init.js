// @remove-file-on-eject
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
    throw err;
});

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const spawn = require('react-dev-utils/crossSpawn');

module.exports = function (
    appPath,
    appName,
    verbose,
    originalDirectory,
    template
) {
    const ownPackageName = require(path.join(__dirname, '..', 'package.json'))
        .name;
    const ownPath = path.join(appPath, 'node_modules', ownPackageName);
    const appPackage = require(path.join(appPath, 'package.json'));
    const useYarn = fs.existsSync(path.join(appPath, 'yarn.lock'));
    // Change displayed command to yarn instead of yarnpkg
    const displayedCommand = useYarn ? 'yarn' : 'npm';

    // Copy over some of the devDependencies
    appPackage.dependencies = appPackage.dependencies || {};

    // Setup the script rules
    appPackage.scripts = {
        start: 'stylable-scripts start',
        build: 'stylable-scripts build',
        // test: 'stylable-scripts test --env=jsdom',
        eject: 'stylable-scripts eject',
    };

    fs.writeFileSync(
        path.join(appPath, 'package.json'),
        JSON.stringify(appPackage, null, 2)
    );

    const readmeExists = fs.existsSync(path.join(appPath, 'README.md'));
    if (readmeExists) {
        fs.renameSync(
            path.join(appPath, 'README.md'),
            path.join(appPath, 'README.old.md')
        );
    }

    // Copy the files for the user
    const templatePath = template
        ? path.resolve(originalDirectory, template)
        : path.join(ownPath, 'template');
    if (fs.existsSync(templatePath)) {
        fs.copySync(templatePath, appPath);
    } else {
        console.error(
            `Could not locate supplied template: ${chalk.green(templatePath)}`
        );
        return;
    }

    // Rename gitignore after the fact to prevent npm from renaming it to .npmignore
    // See: https://github.com/npm/npm/issues/1862
    fs.move(
        path.join(appPath, 'gitignore'),
        path.join(appPath, '.gitignore'),
        [],
        err => {
            if (err) {
                // Append if there's already a `.gitignore` file there
                if (err.code === 'EEXIST') {
                    const data = fs.readFileSync(path.join(appPath, 'gitignore'));
                    fs.appendFileSync(path.join(appPath, '.gitignore'), data);
                    fs.unlinkSync(path.join(appPath, 'gitignore'));
                } else {
                    throw err;
                }
            }
        }
    );

    function depsToArray(deps) {
        return Object.keys(deps).map(key => {
            return `${key}@${deps[key]}`;
        });
    }

    // Load template dependencies
    const templateDependenciesPath = path.join(appPath, '.template.dependencies.json');
    const templateDependenciesJson = require(templateDependenciesPath);
    const templateDependencies = depsToArray(templateDependenciesJson.dependencies);
    const templateDevDependencies = depsToArray(templateDependenciesJson.devDependencies);
    fs.unlinkSync(templateDependenciesPath);

    let command;
    let args, devArgs;

    if (useYarn) {
        command = 'yarnpkg';
        args = ['add'].concat(templateDependencies);
        devArgs = ['add', '--dev'].concat(templateDevDependencies);
    } else {
        command = 'npm';
        args = ['install', '--save', verbose && '--verbose'].filter(e => e).concat(templateDependencies);
        devArgs = ['install', '--save-dev', verbose && '--verbose'].filter(e => e).concat(templateDevDependencies);
    }

    console.log(`Installing dependencies and dev dependencies using ${displayedCommand}...`);
    console.log();

    // install dependencies    
    const depsInstall = spawn.sync(command, args, { stdio: 'inherit' });
    if (depsInstall.status !== 0) {
        console.error(`\`${command} ${args.join(' ')}\` failed`);
        return;
    }

    // install dev dependencies    
    const devDepsInstall = spawn.sync(command, devArgs, { stdio: 'inherit' });
    if (devDepsInstall.status !== 0) {
        console.error(`\`${command} ${devArgs.join(' ')}\` failed`);
        return;
    }

    // copy tsconfig.json
    fs.writeFileSync(
        path.join(appPath, 'tsconfig.json'),
        fs.readFileSync(path.join(ownPath, 'tsconfig.template.json'))
    );

    // Display the most elegant way to cd.
    // This needs to handle an undefined originalDirectory for
    // backward compatibility with old global-cli's.
    let cdpath;
    if (originalDirectory && path.join(originalDirectory, appName) === appPath) {
        cdpath = appName;
    } else {
        cdpath = appPath;
    }


    console.log();
    console.log(`Success! Created ${appName} at ${appPath}`);
    console.log('Inside that directory, you can run several commands:');
    console.log();
    console.log(chalk.cyan(`  ${displayedCommand} start`));
    console.log('    Starts the development server.');
    console.log();
    console.log(
        chalk.cyan(`  ${displayedCommand} ${useYarn ? '' : 'run '}build`)
    );
    console.log('    Bundles the app into static files for production.');
    console.log();
    console.log(chalk.cyan(`  ${displayedCommand} test`));
    console.log('    Starts the test runner.');
    console.log();
    console.log(
        chalk.cyan(`  ${displayedCommand} ${useYarn ? '' : 'run '}eject`)
    );
    console.log(
        '    Removes this tool and copies build dependencies, configuration files'
    );
    console.log(
        '    and scripts into the app directory. If you do this, you can’t go back!'
    );
    console.log();
    console.log('We suggest that you begin by typing:');
    console.log();
    console.log(chalk.cyan('  cd'), cdpath);
    console.log(`  ${chalk.cyan(`${displayedCommand} start`)}`);
    if (readmeExists) {
        console.log();
        console.log(
            chalk.yellow(
                'You had a `README.md` file, we renamed it to `README.old.md`'
            )
        );
    }
    console.log();
    console.log('Happy hacking!');
};
