const yargs = require('yargs');
const { spawn } = require('child_process');
const { join, dirname } = require('path');

const integrationsList = [
    '*-plugin',
    'jest',
    'eslint-plugin-stylable',
    'webpack-extensions',
    'uni-driver',
];

const {
    all,
    integrations,
    corePackages,
    packages,
    glob,
    timeout: timeoutOverride,
} = yargs
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
    .alias('h', 'help')
    .help()
    .strict()
    .wrap(yargs.terminalWidth())
    .parse();

let {
    glob: globPath,
    parallel = true,
    timeout = 10000,
} = createRunParameters({ all, corePackages, glob, integrations, packages });

timeout = timeoutOverride ?? timeout;

spawn(
    getMochaRunner(),
    [
        globPath,
        ...(parallel !== undefined ? ['--parallel'] : []),
        ...(timeout !== undefined ? ['--timeout', timeout] : []),
    ],
    { stdio: 'inherit' }
).on('exit', (code) => {
    process.exit(code);
});

function createRunParameters({ integrations, packages, corePackages, all, glob }) {
    /**
     * @type {{ glob: string; timeout?: number; parallel?: boolean}}
     */
    let runParameters;

    if (integrations) {
        runParameters = {
            glob: `./packages/{${integrationsList.join(',')}}/dist/test/**/*.spec.js`,
        };
    } else if (packages?.length) {
        const packagesList =
            packages.length === 1
                ? stripStylablePrefix(packages[0])
                : `{${packages.map(stripStylablePrefix).join()}}`;

        runParameters = {
            glob: `./packages/${packagesList}/dist/test/**/*.spec.js`,
            timeout: 20000,
            parallel: false,
        };
    } else if (corePackages) {
        runParameters = {
            glob: `./packages/!(${integrationsList.join('|')})/dist/test/**/*.spec.js`,
        };
    } else if (glob) {
        runParameters = {
            glob,
        };
    } else if (all) {
        runParameters = {
            glob: './packages/*/dist/test/**/*.spec.js',
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

function getMochaRunner() {
    const topLevelDirectory = join(__dirname, '..');
    const mochaFilePath = require.resolve('mocha', { paths: [topLevelDirectory] });

    return join(dirname(mochaFilePath), 'bin', '_mocha');
}
