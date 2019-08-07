# @stylable/language-service

[![npm version](https://img.shields.io/npm/v/@stylable/language-service.svg)](https://www.npmjs.com/package/stylable/core)

## Overview

The Stylable language service serves as the basis for the `stylable-intelligence` vscode extension. It provides the business logic for resolving code completions, diagnostics, go to definition, syntax highlighting and more.

All CSS language support functionality is also supported (hover hints, inline color picker, etc.). Some CSS diagnostics were removed in order to support custom Stylable syntax.

## Installation

* Clone this repo
* Run `yarn` to install dependencies (in the mono-repo root)
* Run `cd packages/language-service` to access the package directory
* Run `yarn test` to test the language service

## Misc. Resources

* VSCode example client/server: https://code.visualstudio.com/docs/extensions/example-language-server
* VSCode extension reference: https://code.visualstudio.com/docs/extensionAPI/overview
* CSS Language Service: https://github.com/Microsoft/vscode-css-languageservice
* CSS Syntax Highlighter (TextMate format, base for our own): https://github.com/Microsoft/vscode/blob/master/extensions/css/syntaxes/css.tmLanguage.json
* Color Icon and Color Picker: https://github.com/Microsoft/vscode/issues/38959
* Allow disabling Color Picker: https://github.com/Microsoft/vscode/issues/42344
* Why no file icon in VScode? : https://github.com/Microsoft/vscode/issues/14662
* Issues regarding completion display/filtering:
  * Bug in completion text matching (mine): https://github.com/Microsoft/vscode/issues/34542
  * Lots of explanations and links to code about how completions are ordered and filtered: https://github.com/Microsoft/vscode/issues/26096
  * Link to activating completion ranking display: https://github.com/Microsoft/vscode/issues/41060#issuecomment-357879748
