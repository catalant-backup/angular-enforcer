# angular-enforcer
Command line script to lint style rules in Angular templates and automatically correct them.
Can be used on any HTML file, not just Angular templates.

## Installation
`npm install angular-enforcer -g`

## Running
`enforce [file path]`
where [file path] is a directory to glob for html files

## TODO
- specify file extension to look for
- add a -s option to save files, disable by default
- add linting features
     - lint when using HTML tags in an invalid way
- add formatter options
     - tab length
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
