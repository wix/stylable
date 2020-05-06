import path from 'path';
import { createProjectFromTemplate } from './create-project';

const tsReactWebpackTemplatePath = path.join(__dirname, '../template/ts-react-webpack');

const cliArgs = process.argv.slice(2);
const [targetPath] = cliArgs.filter((arg) => !arg.startsWith('--'));

if (targetPath) {
    createProjectFromTemplate({
        templatePath: tsReactWebpackTemplatePath,
        targetDirectoryPath: path.resolve(targetPath),
        verbose: cliArgs.includes('--verbose'),
    }).catch((e) => {
        console.error(e);
        process.exitCode = 1;
    });
} else {
    console.error(`create-stylable-app <project-name>`);
    process.exitCode = 1;
}
