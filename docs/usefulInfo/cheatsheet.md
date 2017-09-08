# Stylable Cheatsheet

 ## CSS Terminology - [docs](https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Syntax#CSS_Declarations)

 * **Simple selector**: Type selector, class selector (+Stylable [root class](../references/root.md))
 * **CSS property**: Name of the rule (e.g. color)
 * **CSS declaration**: CSS property paired with a value
 * **CSS declaration Block**: List of CSS declarations
 * **CSS ruleset**: CSS declaration block paired with a selector

## Stylable

[Stylable Docs Site](www.stylable.io)

Syntax unique to Stylable - Click each to access code examples and descriptions in GitHub

 * **Directive rules** `-st-*` Instructions for the **Stylable** pre-processor, removed during transpilation
    * [**`-st-extends`**](../references/extend-stylesheet.md) Simple selector base class
    * [**`-st-compose`**](../references/compose-css-class.md) Append class selector
    * [**`-st-states`**](../references/pseudo-classes.md) Define custom pseudo-classes
    * [**`-st-mixin`**](../references/mixin-syntax.md) Apply mixins to CSS ruleset  
    
* **Selectors**
    * [**`::X`**](../references/pseudo-elements.md) Target internal part (pseudo-element) 
    * [**`:X`**](../references/pseudo-classes.md) Target states including native and custom (pseudo-classes)
    * [**`:--X`**](../references/custom-selectors.md) selector shortcut (custom selector)
    * [**`:global(X)`**](../references/global-selectors.md) keep selector global  

* [**`:import {}`**](../references/imports.md) Import external assets like mixins, stylesheets, common CSS and vars
    * [**`-st-from`**](../references/imports.md) Location of file to import
    * [**`-st-default`**](../references/imports.md) Import the file's default export value
    * [**`-st-named`**](../references/imports.md) Import the file's named export value or values
    * [**`-st-theme`**](../references/theme.md) Use stylesheet import as theme of stylesheet  
    
* [**`@namespace "readable name";`**](../references/namespace.md) Development display name for debugging
