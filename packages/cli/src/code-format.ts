#!/usr/bin/env node
import yargs from 'yargs';
import { nodeFs } from '@file-services/node';
import { Stylable } from '@stylable/core';
import { StylableLanguageService } from '@stylable/language-service';
import { createLogger } from './logger';
import { writeFileSync } from 'fs';

const { join } = nodeFs;

const argv = yargs
    .usage('$0 [options]')
    .option('target', {
        type: 'string',
        description: 'file or directory to format',
        alias: 'T',
        default: process.cwd(),
        defaultDescription: 'current working directory',
    })
    .option('endWithNewline', {
        type: 'boolean',
        description: 'End output with newline',
        alias: 'n',
        default: false,
    })
    .option('indentEmptyLines', {
        type: 'boolean',
        description: 'Keep indentation on empty lines',
        alias: 'E',
        default: false,
    })
    .option('indentSize', {
        type: 'number',
        description: 'Indentation size',
        alias: 's',
        default: 4,
    })
    .option('indentWithTabs', {
        type: 'boolean',
        description: 'Indent with tabs, overrides -s and -c',
        alias: 't',
        default: false,
    })
    .option('maxPerserveNewlines', {
        type: 'number',
        description: 'Maximum number of line-breaks to be preserved in one chunk',
        alias: 'm',
        default: 1,
    })
    .option('newlineBetweenRules', {
        type: 'boolean',
        description: 'Add a newline between CSS rules',
        alias: 'N',
        default: true,
    })
    .option('perserveNewlines', {
        type: 'boolean',
        description: 'Preserve existing line-breaks',
        alias: 'N',
        default: true,
    })
    .option('selectorSeparatorNewline', {
        type: 'boolean',
        description: 'Add a newline between multiple selectors',
        alias: 'L',
        default: true,
    })
    .option('debug', {
        type: 'boolean',
        description: 'Enable explicit debug log',
        alias: 'D',
        default: false,
    })
    .option('require', {
        type: 'array',
        description: 'require hooks',
        alias: 'r',
        default: [] as string[],
    })

    .alias('h', 'help')
    .alias('v', 'version')
    .help()
    .strict()
    .wrap(yargs.terminalWidth())
    .parseSync();

const {
    debug,
    endWithNewline,
    indentEmptyLines,
    indentSize,
    indentWithTabs,
    maxPerserveNewlines,
    newlineBetweenRules,
    perserveNewlines,
    require: requires,
    selectorSeparatorNewline,
    target,
} = argv;

const log = createLogger('[Stylable code formatter]', debug);

log('[Arguments]', argv);

// execute all require hooks before running the CLI build
for (const request of requires) {
    if (request) {
        require(request);
    }
}

const stylable = Stylable.create({
    fileSystem: nodeFs,
    requireModule: require,
    projectRoot: target,
    resolverCache: new Map(),
});
const lsp = new StylableLanguageService({ fs: nodeFs, stylable });

function readDirectoryDeep(dirPath: string, fileSuffixFilter = '.st.css') {
    const files = nodeFs.readdirSync(dirPath, 'utf-8');
    let res: string[] = [];

    for (const item of files) {
        const currentlFilePath = join(dirPath, item);
        const itemStat = nodeFs.statSync(join(currentlFilePath));

        if (itemStat.isFile() && item.endsWith(fileSuffixFilter)) {
            res.push(currentlFilePath);
        } else if (itemStat.isDirectory()) {
            res = res.concat(readDirectoryDeep(currentlFilePath));
        }
    }

    return res;
}

function formatStylesheet(filePath: string) {
    log('Formatting: ' + filePath);
    const fileContent = nodeFs.readFileSync(filePath, 'utf-8');

    const formatting = lsp.formatDocument(
        filePath,
        { start: 0, end: fileContent.length },
        {
            end_with_newline: endWithNewline,
            indent_empty_lines: indentEmptyLines,
            indent_size: indentSize,
            indent_with_tabs: indentWithTabs,
            max_preserve_newlines: maxPerserveNewlines,
            newline_between_rules: newlineBetweenRules,
            preserve_newlines: perserveNewlines,
            selector_separator_newline: selectorSeparatorNewline,
        }
    );

    if (formatting.length) {
        writeFileSync(filePath, formatting[0].newText);
        log('File formatted successfully');
    } else {
        log('No formatting required');
    }
}

log('Starting code formatting process');
const formatPathStats = nodeFs.statSync(target);

if (formatPathStats.isFile()) {
    if (target.endsWith('.st.css')) {
        formatStylesheet(target);
    } else {
        throw new Error('cannot format file, not a Stylable stylesheet (.st.css)');
    }
} else if (formatPathStats.isDirectory()) {
    const stylesheets = readDirectoryDeep(target);

    if (stylesheets.length) {
        for (const stylesheet of stylesheets) {
            formatStylesheet(stylesheet);
        }
    } else {
        throw new Error('cannot find any Stylable stylesheets (.st.css) in directory: ' + target);
    }
}

log('All code formatting complete');
