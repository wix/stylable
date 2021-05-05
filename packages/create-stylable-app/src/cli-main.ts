import path from 'path';
import yargs from 'yargs';
import { createProjectFromTemplate } from './create-project';

const { argv } = yargs
    .usage('npm init stylable-app <project-name>')
    .option('template', {
        alias: 't',
        type: 'string',
        description: 'Stylable project template to use',
        default: 'ts-react-webpack',
        choices: ['ts-react-webpack', 'ts-react-rollup'],
    })
    .option('verboseNpm', {
        type: 'boolean',
        description: 'enable verbose logging',
        default: false,
    })
    .alias('h', 'help')
    .alias('v', 'version')
    .help()
    .strict();

const targetPath = argv._[0].toString();

if (targetPath) {
    createProjectFromTemplate({
        templatePath: path.join(__dirname, '../template', argv.template),
        targetDirectoryPath: path.resolve(targetPath),
        verbose: argv.verboseNpm,
    }).catch((e) => {
        console.error(e);
        process.exitCode = 1;
    });
} else {
    console.error(`create-stylable-app <project-name>`);
    process.exitCode = 1;
}
