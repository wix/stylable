# Cheatsheet:

 ## CSS - [docs](https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Syntax#CSS_Declarations)

 * **simple selector**: type selector, class selector (+Stylable [root class](./root.md))
 * **CSS property**: name of the rule (e.g. color)
 * **CSS declaration**: CSS property with value
 * **CSS declaration Block**: CSS declaration list
 * **CSS ruleset**: selector with CSS declaration

## Stylable

 * **directive rule**: `-st-*` rules that hint Stylable
    * **[-st-from](../references/imports.md)**: import location
    * **[-st-default](../references/imports.md)**: import default export
    * **[-st-named](../references/imports.md)**: import named exports
    * **[-st-extends](../references/extend-stylesheet.md)**: simple selector base class
    * **[-st-states](../references/pseudo-classes.md)**: define custom pseudo-classes
    * **[-st-mixin](../references/mixin-syntax.md)**: apply mixins to CSS ruleset
    * **[-st-variant](../references/variants.md)**: apply pre-made look and feel
* **selectors**
    * **[Pseudo-elements](../references/pseudo-elements.md)**: `::X` target internal part 
    * **[Pseudo-classes](../references/pseudo-classes.md)**: `:X` target state
    * **[Custom selectors](../references/custom-selectors.md)**: `:--X` selector shortcut
    * **[Global selectors](../references/global-selectors.md)**: `:global(X)` keep selector global - not scoped
* **[namespace](../references/namespace.md)**: `@namespace "readable name"` - hint for better development mode
