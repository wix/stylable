---
id: getting-started/stylable-intelligence
title: Stylable Intelligence
layout: docs
---

**Stylable Intelligence** is an extension implementing the Language Server Protocol that provides IDE support for **Stylable**. It currently provides:
* Code completion 
* Diagnostics

## Installation

You can install **Styllable Intelligence** from:
* Visual Studio Code market:
    * In your VSC window, click the **Extentions** icon to open the market.
    * In the search field, enter **Stylable Intelligence**. 
    * Install and reload the window when prompted.

* [GitHub](https://github.com/wix/stylable-intelligence) from the `.vsix` file. 

When installed: 
* The client is located in `packages/client/`. It is a VSCode extension that loads and registers the server.
* The server is located in `packages/server/`. It is a language server according to the Laguage Server Protocol.

>**Note:**  
>Future plans include:
>* More Language Server features. 
>* Support for JetBrains IDEs (WebStorm, IntelliJ). Currently supported only in VSCode (version 1.16 and later).