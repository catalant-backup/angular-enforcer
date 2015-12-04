import path from 'path';
import _ from 'lodash';
import { DefaultHandler, Parser, DomUtils } from 'htmlparser2';
import wrap from 'wordwrap';
import minimist from 'minimist';
import 'string.prototype.repeat';



export default function angularEnforcer (fileData, options) {


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
        'wbr',
        ...options.shortTags
    ];

    // tags to ignore wrapping
    const ignoredWrapTags = [
        'script', 'style',
        ...options.wrapIgnoredTags
    ];

    // format an attribute value
    function formatValue(value, indent) {
        if (value[0] === '{' && _.last(value) === '}') {
            let spaces = ' '.repeat(indent);
            return value.replace(/\,\s\'/g, ',\n'+ spaces +'\'');
        }
        return value;
    }

    function paddingLeft(level) {
        if (options.spaces) {
            return ' '.repeat(options.tabLength).repeat(level)
        }
        return '\t'.repeat(level)
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
            (spaces.length + raw.length) > options.lineLength) {
            return false;
        }
        const additional_chars = _.last(text.split('\n')).length + node.name.length + 3;
        return node.children.length === 0 && additional_chars <= options.lineLength;
    }

    function formateNodeHeader(node, spaces, level) {
        let text = '';
        let rawNode = getRaw(node);
        if (node.name) {
            if ((spaces.length + rawNode.length + 3) <= options.lineLength || options.attrNewline === false) {
                if (isSelfClosing(node) && options.closingSlash) {
                    text = spaces + '<' + rawNode + ' />\n';
                } else {
                    text = spaces + '<' + rawNode + '>\n';
                }
            } else {
                let attrs = _.pairs(node.attribs);
                text = spaces + '<' + node.name + ' ';
                // format attributes
                if (options.reorderAttrs) {
                    attrs = _.sortBy(attrs, (x) => x[0]);
                }
                attrs.forEach(([attrName, attrValue], index) => {
                    if (index > 0) {
                        if (options.spaces) {
                            text += spaces + ' '.repeat(options.tabLength);
                        } else {
                            text += spaces + '\t';
                        }
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
        if (canEndSameLine(node, text, spaces, rawNode) && options.emptyTagSameLine) {
            text = text.substring(0, text.length - 1);
        }
        return text;
    }

    function formatText (spaces, text) {
        if (options.exprPadding) {
            text = text.replace('{{', '{{ ').replace('}}', ' }}');
        }
        if (options.textWrap) {
            let wrapLine = wrap(spaces.length, options.lineLength);
            let wrappedText = wrapLine(text);
            return spaces + decodeURI(wrappedText).trim() + '\n';
        }
        return spaces.substr(1) + text + '\n';
    }

    function parseNode(node, level=0) {
        //console.log('\n\n', node);
        let text = '';
        let spaces = paddingLeft(level);
        text += formateNodeHeader(node, spaces, level);
        let sameLineEnding = text[text.length - 1] !== '\n';
        if (node.type === 'comment' && !options.removeComments) {
            return spaces + '<!-- ' + node.data.trim() + ' -->\n';
        }
        if (node.children) {
            node.children.forEach((child) => {
                text += parseNode(child, level + 1);
            });
        }
        if ((node.type === 'text' && !node.parent) ||
            (node.type === 'text' && node.parent &&
             !_.includes(ignoredWrapTags, node.parent.type))){
            text += formatText(spaces, node.data);
        }
        if (node.name && !isSelfClosing(node)) {
            if (sameLineEnding){
                text += '</' + node.name + '>\n';
            } else {
                text += spaces + '</' + node.name + '>\n';
            }
        }
        // short lines
        if (options.shortTextNodes &&
            node.children &&
            node.children.length === 1 &&
            node.children[0].type === 'text') {
            return spaces + '<'+getRaw(node)+'>'+node.children[0].data.trim()+'</'+node.name+'>\n';
        }
        return text;
    }

    return new Promise((resolve, reject) => {
        let data = fileData.replace(/\>[\s]+\</gi, '><')
            .replace(/\n\s+/gi, ' ');

        let handler = new DefaultHandler((err, dom) => {
            if (err) {
                reject(err);
            } else {
                //console.log(JSON.stringify(dom, null, 4));
                let final_text = '';
                dom.forEach((node) => {
                    final_text += parseNode(node);
                });
                //console.log(final_text);
                resolve(final_text);
            }

        }, {
            ignoreWhitespace: true
        });
        let parser = new Parser(handler);
        parser.parseComplete(data);
    });
}
