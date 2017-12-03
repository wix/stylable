---
id: getting-started/stylable-intelligence
title: Stylable Intelligence
layout: docs
---

**Stylable Intelligence** is an extension implementing the Language Server Protocol that provides IDE support for **Stylable**. It currently includes:
* Code completion 
* Diagnostics

## Installation

You can install **Stylable Intelligence** from:
* Visual Studio Code market:
    * In your VSC window, click the **Extentions** icon to open the market.
    * In the search field, enter **Stylable Intelligence**. 
    * Install and reload the window when prompted.

* [GitHub](https://github.com/wix/stylable-intelligence) from the `.vsix` file. 

## IDE extensions

Because stylable-intelligence registers `.st.css` files as Stylable and not CSS, certain CSS extensions may not work until they explicitly add Stylable support. The stylable-intelligence extension for VSCode is compatible with the following CSS extensions:

1. [CssTriggers](https://github.com/kisstkondoros/csstriggers)(^0.4.0) - A VSCode extension which adds inline decoration to css properties to indicate their costs.

If you are using an extension that you would like to add to this list, let us know and we're happy to help.

## CSS functionality

Because Stylable files are not recognized as CSS, we proxy the CSS Language Server through stylable-intelligence. Most basic features are already supported, but if you notice anything strange, let us know.

> **Note:**  
> Future plans include:
> * More Language Server features. 
> * Support for JetBrains IDEs (WebStorm, IntelliJ). Currently supported only in VSCode (version 1.16 and later).