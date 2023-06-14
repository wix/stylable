#!/usr/bin/env node
import yargs from 'yargs';
import { nodeFs } from '@file-services/node';
import { getDocumentFormatting, formatCSS } from '@stylable/code-formatter';
import { createLogger } from './logger';
import { writeFileSync } from 'fs';

const { join } = nodeFs;

const argv = yargs
    .usage('$0 [options]')
    .option('experimental', {
        type: 'boolean',
        description: 'use experimental code formatter',
        default: false,
    })
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
        alias: 'p',
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
        description: 'Enable explicit debug log (overrides --silent)',
        alias: 'D',
        default: false,
    })
    .option('silent', {
        type: 'boolean',
        description: 'Will not print any messages to the log',
        alias: 'S',
        default: false,
    })
    .option('require', {
        type: 'array',
        description: 'require hooks',
        string: true,
        alias: 'r',
        default: [] as string[],
    })
    .option('wrapLineLength', {
        type: 'number',
        description: 'Length of line to be considered when wrapping',
        alias: 'W',
        default: 80,
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
    silent,
    experimental,
    wrapLineLength,
} = argv;

const log = createLogger(
    (_, ...messages) => console.log('[Stylable code formatter]', ...messages),
    () => console.clear()
);

if (debug) {
    log('[Arguments]', argv);
}

// execute all require hooks before running the CLI build
for (const request of requires) {
    require(request);
}

function readDirectoryDeep(dirPath: string, fileSuffixFilter = '.st.css', res = new Set<string>()) {
    const items = nodeFs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
        const path = join(dirPath, item.name);

        if (item.isFile() && path.endsWith(fileSuffixFilter)) {
            res.add(path);
        } else if (item.isDirectory()) {
            readDirectoryDeep(path, fileSuffixFilter, res);
        }
    }

    return res;
}

function formatStylesheet(filePath: string) {
    const fileContent = nodeFs.readFileSync(filePath, 'utf-8');

    const newText = experimental
        ? formatCSS(fileContent, {
              indent: ' '.repeat(indentSize),
              endWithNewline,
              wrapLineLength,
          })
        : getDocumentFormatting(
              fileContent,
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

    if (newText.length) {
        writeFileSync(filePath, newText);

        if (!silent || debug) {
            log(`Formatted: ${filePath}`);
        }
    } else if (debug) {
        log(`No formatting required for: ${filePath}`);
    }
}

if (debug) {
    log('Starting code formatting');
}

const formatPathStats = nodeFs.statSync(target);

if (formatPathStats.isFile()) {
    if (target.endsWith('.st.css')) {
        formatStylesheet(target);
    } else {
        throw new Error('cannot format file, not a Stylable stylesheet (.st.css)');
    }
} else if (formatPathStats.isDirectory()) {
    const stylesheets = readDirectoryDeep(target);

    if (stylesheets.size) {
        for (const stylesheet of stylesheets) {
            formatStylesheet(stylesheet);
        }
    } else {
        throw new Error('cannot find any Stylable stylesheets (.st.css) in directory: ' + target);
    }
}

if (debug) {
    log('All code formatting complete');
}
