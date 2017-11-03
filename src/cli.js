#!/usr/bin/env node

import ngEnforcer from './angular-enforcer.js';
import minimist from 'minimist';
import glob from 'glob';
import fs from 'fs';
import path from 'path';
import 'colors';
import { diffLines } from 'diff';

const argv = minimist(process.argv.slice(2), {
    boolean: ['glob', 'stdin', 'verbose', 'save', 'quiet', 'diff'],
    alias: {
        'glob': 'g',
        'stdin': 'i',
        'verbose': 'v',
        'save': 'S',
        'quiet': 'q',
        'diff': 'd',
        'config': 'c'
    }
});


// CONFIG FILE
const configPath = argv.config || '.enforcer.json';
function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

// first try this directory, then try the home directory
let config = {};
try {
    config = JSON.parse(fs.readFileSync(configPath).toString());
} catch (e) {
    let dotFilePath = path.join(getUserHome(), '.enforcer.json');
    try {
        config = JSON.parse(fs.readFileSync(dotFilePath).toString());
    } catch (e) {}
}


function stringToList (list) {
    if (list) {
        return list.split(',');
    }
    return list;
}

const options = {
    // working options
    tabLength: argv['tab-length'] || 4,
    spaces: argv['spaces'] || true,
    lineLength: argv['line-length'] || 100,
    closingSlash: argv['closing-slash'] || false,
    exprPadding: argv['expr-padding'] || true,
    attrNewline: argv['attr-newline'] || true,
    textWrap: argv['text-wrap'] || true,
    wrapIgnoredTags: stringToList(argv['wrap-ignored-tags']) || [],
    shortTags: stringToList(argv['short-tags']) || [],
    emptyTagSameLine: argv['empty-tag-same-line'] || true,
    removeComments: argv['remove-comments'] || false,
    shortTextNodes: argv['short-text-nodes'] || true,
    reorderAttrs: argv['reorder-attrs'] || true,

    // not working options
    attrObjIndent: argv['attr-obj-indent'] || true,
    doubleQuotes: argv['double-quotes'] || true,
    blockSpacing: argv['block-spacing'] || true,
    ...config
};



function printDiff(oldData, newData) {
    var diff = diffLines(oldData, newData);

    diff.forEach(function(part){
        // green for additions, red for deletions
        // grey for common parts
        var color = part.added ? 'green' :
            part.removed ? 'red' : 'grey';
        process.stdout.write(part.value[color]);
    });

    process.stdout.write('\n');
}

// process a raw string
function processFileData (filePath, oldData) {
    if (argv.verbose) {
        if (filePath) {
            console.log('Processing file: ' + filePath);
        } else {
            console.log('Processing from STDIN');
        }
    }
    return new Promise((resolve, reject) => {
        const result = ngEnforcer(oldData, options);
        result.then((newData) => {
            if (argv.save) {
                if(!filePath) {
                    if (argv.verbose) {
                        console.log('Writing to STDOUT');
                    }
                    process.stdout.write(newData);
                } else {
                    fs.writeFile(filePath, newData, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            if (!argv.quiet && argv.diff) {
                                printDiff(oldData, newData);
                            }
                            if (argv.verbose) {
                                console.log('Writing to '+filePath);
                            }
                            resolve(newData);
                        }
                    });
                }
            } else {
                if (!argv.quiet && argv.diff) {
                    printDiff(oldData, newData);
                }
                resolve(null);
            }
        }, (err) => {
            reject(err);
        });
    });
}

// process one file from a path
function processOneFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err && err.code === 'EISDIR'){
                console.error('ERROR: The path you entered is a directory, not a file.');
            } else {
                processFileData(filePath, data.toString()).then(resolve, reject);
            }
        });
    });
}

// process multiple files from a glob
function processFiles(globString, basePath) {
    let files = glob.sync(globString);
    let filePromises = [];

    files.forEach( (file) => {
        const filePath = path.resolve(basePath, file);
        filePromises.push(processOneFile(filePath));
    });
    return Promise.all(filePromises);
};


if (argv.verbose && argv.save) {
    console.log('Saving is on');
}

if (argv.verbose && argv.glob) {
    console.log('Globbing is on');
}

if (argv.verbose && argv.diff) {
    console.log('Diff logging is on');
}

// handle STDIN
if (argv.stdin) {
    process.stdin.setEncoding('utf8');

    let data = '';
    process.stdin.on('readable', () => {
        var chunk = process.stdin.read();
        if (chunk !== null) {
            data += chunk;
        }
    });

    process.stdin.on('end', () => {
        processFileData(null, data);
    });

// Handle multiple files
} else if (argv.glob){
    const globString = argv.glob === true ? '**/*.html' : argv.glob;
    if (argv.verbose) {
        console.log('Glob string: '+ globString);
    }
    processFiles(globString, process.cwd())
        .then((fileData) => {
            console.log('Finished with '+fileData.length + ' files');
        }, (err) => {
            console.log('Could not open files.')
            console.error(err);
        })

// handle single file
} else {

    const filePath = argv._.toString();
    if (!filePath) {
        console.error('No file path specified!');
    } else {
        processOneFile(filePath)
            .then(() => {
                console.log('Finished with 1 file');
            });
    }
}
