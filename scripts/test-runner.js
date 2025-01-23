//@ts-check
const yargs = require('yargs');
const { fork } = require('child_process');
const { once } = require('events');

const integrationsList = [
    '*-plugin',
    'jest',
    'eslint-plugin-stylable',
    'webpack-extensions',
    'uni-driver',
    'experimental-loader',
];

run()
    .then(([exitCode]) => {
        process.exitCode = exitCode;
    })
    .catch((error) => {
        process.exitCode = 1;
        console.error(error);
    });

async function run() {
    const {
        all,
        integrations,
        corePackages,
        packages,
        glob,
        timeout: timeoutOverride,
        parallel,
    } = await yargs
        .usage('$0 [options]')
        .option('all', {
            alias: 'a',
            type: 'boolean',
            describe: 'Run all tests',
            default: true,
        })
        .option('integrations', {
            alias: 'i',
            type: 'boolean',
            describe: 'Run Stylable integrations tests',
        })
        .option('corePackages', {
            alias: 'cp',
            type: 'boolean',
            describe: 'Run Stylable core packages tests',
        })
        .option('packages', {
            alias: 'p',
            type: 'array',
            describe: 'Run tests for specific packages',
        })
        .option('glob', {
            type: 'string',
            describe: 'glob to test files',
        })
        .options('timeout', {
            type: 'number',
            describe: 'timeout for each test',
        })
        .option('parallel', {
            type: 'boolean',
            describe: 'run tests in parallel',
        })
        .alias('h', 'help')
        .help()
        .strict()
        .wrap(yargs.terminalWidth())
        .parse();

    let { glob: globPath, timeout = 10000 } = createRunParameters({
        all,
        corePackages,
        glob,
        integrations,
        packages,
    });

    timeout = timeoutOverride !== null && timeoutOverride !== undefined ? timeoutOverride : timeout;

    const childProcess = fork(
        require.resolve('mocha/bin/_mocha'),
        [
            globPath,
            ...(parallel ? ['--parallel'] : []),
            ...(timeout !== undefined ? ['--timeout', String(timeout)] : []),
        ],
        { stdio: 'inherit' },
    );

    return once(childProcess, 'exit');
}

function createRunParameters({ integrations, packages, corePackages, all, glob }) {
    /**
     * @type {{ glob: string; timeout?: number } | undefined}
     */
    let runParameters = undefined;

    if (integrations) {
        runParameters = {
            glob: createTestFilesGlob(`{${integrationsList.join(',')}}`),
        };
    } else if (packages && packages.length) {
        const packagesList =
            packages.length === 1
                ? stripStylablePrefix(packages[0])
                : `{${packages.map(stripStylablePrefix).join()}}`;

        runParameters = {
            glob: createTestFilesGlob(packagesList),
            timeout: 20000,
        };
    } else if (corePackages) {
        runParameters = {
            glob: createTestFilesGlob(`!(${integrationsList.join('|')})`),
        };
    } else if (glob) {
        runParameters = {
            glob,
        };
    } else if (all) {
        runParameters = {
            glob: createTestFilesGlob('*'),
        };
    }

    if (!runParameters) {
        throw new Error('No test files specified');
    }

    return runParameters;
}

function stripStylablePrefix(scopeName) {
    return scopeName.replace(/^@stylable\//, '');
}

function createTestFilesGlob(packagesPattern) {
    return `./packages/${packagesPattern}/dist/test/**/*.spec.js`;
}
