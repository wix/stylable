---
id: getting-started/cheatsheet
title: Specification Overview
layout: docs
---


## CSS Terminology

 * **Simple selector**: Type selector, class selector (+Stylable [root class](../references/root.md))
 * **CSS property**: Name of the rule (e.g. color)
 * **CSS declaration**: CSS property paired with a value
 * **CSS declaration Block**: List of CSS declarations
 * **CSS ruleset**: CSS declaration block paired with a selector

[MDN docs](https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Syntax#CSS_Declarations)

## Stylable

Syntax unique to Stylable - Click each to access code examples and descriptions

 * **Directive rules** `-st-*` Instructions for the **Stylable** pre-processor, removed during transpilation
    * [**`-st-extends`**](../references/extend-stylesheet.md) Simple selector base class
    * [**`-st-compose`**](../references/compose-css-class.md) Append class selector
    * [**`-st-states`**](../references/pseudo-classes.md) Define custom pseudo-classes
    * [**`-st-mixin`**](../references/mixins.md) Apply mixins to CSS ruleset
* **Selectors**
    * [**`.xX`**](../references/class-selectors.md) Class selectors
    * [**`X`**](../references/tag-selectors) Tag/component selectors
    * [**`::X`**](../references/pseudo-elements.md) Target internal part (pseudo-element) 
    * [**`:X`**](../references/pseudo-classes.md) Target states including native and custom (pseudo-classes)
    * [**`:--X`**](../references/custom-selectors.md) Selector alias (custom selector)
    * [**`:global(X)`**](../references/global-selectors.md) Keep selector global
* [**`:import {}`**](../references/imports.md) Import external assets like mixins, stylesheets, common CSS and vars
    * [**`-st-from`**](../references/imports.md) Location of file to import
    * [**`-st-default`**](../references/imports.md) Import the file's default export value
    * [**`-st-named`**](../references/imports.md) Import the file's named export value or values
    * [**`-st-theme`**](../references/theme.md) Use stylesheet import as theme of stylesheet
* [**`@namespace "readable name";`**](../references/namespace.md) Development display name for debugging
* [**`:vars{}`**](../references/variables.md) Define common values to be used across the stylesheet or project
* [**formatters**](../references/formatters.md) Custom TypeScript/JavaScript functions for generating declaration values