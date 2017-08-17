# Cheatsheet:

 ## CSS - [docs](https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Syntax#CSS_Declarations)

 * **simple selector**: type selector, class selector (+Stylable [root class](../references/root.md))
 * **CSS property**: name of the rule (e.g. color)
 * **CSS declaration**: CSS property with value
 * **CSS declaration Block**: CSS declaration list
 * **CSS ruleset**: selector with CSS declaration

## Stylable

 * **directive rule** `-st-*` rules that hint Stylable
    * [**`-st-extends`**](../references/extend-stylesheet.md) simple selector base class
    * [**`-st-compose`**](../references/compose-css-class.md) append class selector
    * [**`-st-states`**](../references/pseudo-classes.md) define custom pseudo-classes
    * [**`-st-mixin`**](../references/mixin-syntax.md) apply mixins to CSS ruleset
    * [**`-st-variant`**](../references/variants.md) define pre-made look and feel
* **selectors**
    * [**`::X`**](../references/pseudo-elements.md) target internal part (pseudo-element) 
    * [**`:X`**](../references/pseudo-classes.md) target state (pseudo-classe)
    * [**`:--X`**](../references/custom-selectors.md) selector shortcut (custom selector)
    * [**`:global(X)`**](../references/global-selectors.md) keep selector global
* [**`:import {}`**](../references/imports.md) import mixins, stylesheets
    * [**`-st-from`**](../references/imports.md) import location
    * [**`-st-default`**](../references/imports.md) import default export
    * [**`-st-named`**](../references/imports.md) import named exports
* [**`@namespace "readable name";`**](../references/namespace.md) hint for better development mode
