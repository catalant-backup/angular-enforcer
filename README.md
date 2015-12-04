# angular-enforcer
Command line script to lint style rules in Angular templates and automatically correct them.
Can be used on any HTML file, not just Angular templates.

**Features:**

## Corrects missing end-tags
from:
```html
<div>
    <div>
        <span>
            <img>
```
to:
```html
<div>
    <div>
        <span>
            <img>
        </span>
    </div>
</div>
```

## Corrects inconsistent text case
from:
```html
<B>BOLD TEXT</B>
```
to:
```html
<b>
    BOLD TEXT
</b>
```

## Installation
`npm install angular-enforcer -g`

## Usage
### On a specific file
`enforce [file path] [options]`
where [file path] is a path to a file to enforce

### On STDIN
`cat [file path] | enforce -i`
Simply pipe some file into the enforce command

### On a glob
`enforce -g [glob string] [options]`
where [glob string] [node-glob](https://github.com/isaacs/node-glob) is a string to search for files using
Ex: `enforce -g src/folder/**/*.tpl`

### On every html file in this folder and all child folders
`enforce -g [options]`
This will run the angular-enforcer program on every html file in this folder and all child folders

### From node
You can also import angular-enforcer and use it as you want.

```js
import ngEnforcer from 'angular-enforcer';
import 'fs';
const file = fs.readFileSync('file');
const output = ngEnforcer(file, {
    lineLength: 150
});
```

The ngEnforce function takes a string of HTML and options and returns formatted HTML.
Linting is not available when using this method.


## Options

**Formatting options:**
--tab-length : the number of spaces to consider a tab. Default is 4.
--spaces : If true (default), converts spaces to tabs, using the specified tab length. Otherwise it does the reverse, converting tabs to spaces.
--line-length : max line length. Default is 100.
--closing-slash : if true, convert <br> to <br/>. Default is false.
--short-tags : comma separated list of additional tags that have no associated end tag
--expr-padding : add a space before and after angular expressions (and a space after the "::" in one-time binded expressions). Default is true.
--attr-newline : If an html start tag is over the specified line-length, start each attribute on it's own line, indenting by one. Default is true.
--empty-tag-same-line : Empty DOM nodes will end their tags on the same line if it's within the max line length.
--short-text-nodes : DOM nodes with just text that can fit on one line will do so. Default is true. If this is false, the text nodes will be indented.
--attr-obj-indent: Indent JS objects inside attributes, ex: inside ng-class. True by default.
--double-quotes : If true, use double quotes for attributes, otherwise use single quotes.
--reorder-attrs : If true, alphabetize HTML attributes in each tag
--block-spacing : If true, add an empty line in between each HTML block
--text-wrap : If true, break long text nodes so that indentation + length of text <= line-length. Defaults to true.
--wrap-ignored-tags : comma separated list of tags to ignore long text nodes inside
--remove-comments : if true, enforcer will remove all HTML comments


**CLI-only options:**
--config -c : path to the formatting config file. Default is .enforcer.json
--save -S : report and correct all problems, overwriting all affected files
--glob -g : Glob strings to look for files
--stdin -i : read from STDIN instead of giving a file path.
--verbose -v : more verbose reporting, including locations of problems.
--quite -q : silences all output, even when using --diff or --verbose.
--diff -d : print a colored diff of the changes

## .enforcer.json JSON file
All options can be specified in an .enforcer.json file. All options are in camelCase.

```json
{
     "tabLength": 2,
     "lineLength": 120
}
```

### Option load order:
1. command line options
2. .enforcer.json file in current directory (if it exists)
3. .enforcer.json file in home directory (if it exists)

## TODO
- specify file extension to look for
- add a -s option to save files, disable by default
- add linting features
     - lint when using HTML tags in an invalid way
- add formatter options
     - tab length
     - option to start new attributes lined up with the first attribute:
     ```html
     <input class="foobar"
            bar="baz">
     ```
     - max line length
     - Angular expression spaces
     - attribute spacing
     - attribute value formatting
     - self-closing tags
     - new line between code blocks
     - encoding of characters
     - better parsing of angular attributes:
          https://github.com/peerigon/angular-expressions
     - order attributes
          - build in angular directive's preferred order
- unit tests
