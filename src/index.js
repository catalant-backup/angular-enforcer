#!/usr/bin/env node

import path from 'path';
import _ from 'lodash';
import { argv } from 'yargs';
import { DefaultHandler, Parser, DomUtils } from 'htmlparser2';
import wrap from 'wordwrap';
import glob from 'glob';
import fs from 'fs';
import 'string.prototype.repeat';

let basePath = argv._.toString(); // i have no idea

const options = {
    tab_length: 4,
    line_max: 100,
    selfClosingTags: false
}

const selfClosingTags = [
    'area',
    'base',
    'br',
    'col',
    'command',
    'embed',
    'hr',
    'img',
    'input',
    'keygen',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
];

function processFiles(globString, basePath, func) {
    glob(globString, { cwd: basePath }, (err, files) => {
        if (err) {
            console.error('Could not open files');
        } else {
            files.forEach( (file) => {
                const filePath = path.resolve(basePath, file);
                const fileDir = path.dirname(filePath);

                const relativeDir = '/' + path.relative(basePath, fileDir);
                fs.readFile(filePath, (err, data) => {
                    function updateFunc (newData) {
                        fs.writeFile(filePath, newData, (err) => {
                            if (err) {
                                throw err;
                            }
                            console.log('\tFile updated!');
                        });
                    }
                    return func(err, data.toString(), filePath, updateFunc);
                });
            });
        }
    });
};

// format an attribute value
function formatValue(value, indent) {
    if (value[0] === '{' && _.last(value) === '}') {
        let spaces = ' '.repeat(indent);
        return value.replace(/\,\s\'/g, ',\n'+ spaces +'\'');
    }
    return value;
}

function isSelfClosing(node){
    return _.includes(selfClosingTags, node.name);
}

// function to get just the start tag inner text (no <>)
function getRaw(node){
    let text = '';
    text += node.name;
    _.each(node.attribs, (value, key) => {
        text += ' ' +key + '="' + value + '"';
    });
    return text;
}

function canEndSameLine(node, text, spaces, raw) {
    if (!node.name ||
        isSelfClosing(node) ||
        node.type === 'text' ||
        (spaces.length + raw.length) > options.line_max) {
        return false;
    }
    const additional_chars = _.last(text.split('\n')).length + node.name.length + 3;
    return node.children.length === 0 && additional_chars <= options.line_max;
}

function formateNodeHeader(node, spaces, level) {
    let text = '';
    let rawNode = getRaw(node);
    if (node.name) {
        if ((spaces.length + rawNode.length + 3) <= options.line_max) {
            if (isSelfClosing(node) && options.selfClosingTags) {
                text = spaces + '<' + rawNode + ' />\n';
            } else {
                text = spaces + '<' + rawNode + '>\n';
            }
        } else {
            let attrs = _.pairs(node.attribs);
            text = spaces + '<' + node.name + ' ';
            // format attributes
            attrs.forEach(([attrName, attrValue], index) => {
                if (index > 0) {
                    text += spaces + ' '.repeat(options.tab_length);
                }
                text += attrName + '="';
                const indent = _.last(text.split('\n')).length + 1;
                text += formatValue(attrValue, indent) +'"';
                if (index === attrs.length-1) {
                    text += '>\n';
                } else {
                    text += '\n';
                }
            });
        }
    }
    if (canEndSameLine(node, text, spaces, rawNode)) {
        text = text.substring(0, text.length - 1);
    }
    return text;
}

function breakLongLines(line) {
    if (line.length > options.line_max) {
        console.log('long');
        let words = line.split(' ');
        let spaceLeft = options.line_max;
        words.forEach((word) => {
            if (word.length > spaceLeft) {
                word = '\n' + word
                spaceLeft = options.line_max - word.length;
            } else {
                spaceLeft -= word.length;
            }
        });
        return words.join(' ');
    }
    return line;
}

function parseNode(node, level=0) {
    //console.log('\n\n', node);
    let text = '';
    let spaces = spaces = ' '.repeat(options.tab_length).repeat(level);
    text += formateNodeHeader(node, spaces, level);
    let sameLineEnding = text[text.length - 1] !== '\n';
    if (node.children) {
        node.children.forEach((child) => {
            text += parseNode(child, level + 1);
        });
    }
    if (node.type === 'text') {
        let wrapLine = wrap(spaces.length, options.line_max);
        text += spaces + decodeURI(wrapLine(node.data)).trim() + '\n';
    }
    if (node.name && !isSelfClosing(node)) {
        if (sameLineEnding){
            text += '</' + node.name + '>\n';
        } else {
            text += spaces + '</' + node.name + '>\n';
        }
    }
    return text;
}

processFiles('**/*.html', basePath, (err, data, file, update) => {
    console.log('\n', file)
    data = data.replace(/\>[\s]+\</gi, '><').replace(/\n\s+/gi, ' ');

    let handler = new DefaultHandler((err, dom) => {
        if (err)
            console.error(err);
        else {
            //console.log(JSON.stringify(dom, null, 4));
            let final_text = '';
            dom.forEach((node) => {
                final_text += parseNode(node);
            });
            console.log(final_text);
            update(final_text);
        }

    }, {ignoreWhitespace: true});
    let parser = new Parser(handler);
    parser.parseComplete(data);

});
