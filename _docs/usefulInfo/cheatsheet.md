# Cheatsheet:

 ## CSS - [docs](https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Syntax#CSS_Declarations)

 * **simple selector**: type selector, class selector (+Stylable [root class](./root.md))
 * **CSS property**: name of the rule (e.g. color)
 * **CSS declaration**: CSS property with value
 * **CSS declaration Block**: CSS declaration list
 * **CSS ruleset**: selector with CSS declaration

## Stylable

 * **directive rule**: `-st-*` rules that hint Stylable
    * **[-st-from](./imports.md)**: import location
    * **[-st-default](./imports.md)**: import default export
    * **[-st-named](./imports.md)**: import named exports
    * **[-st-extends](./extend-stylesheet.md)**: simple selector base class
    * **[-st-states](./pseudo-classes.md)**: define custom pseudo-classes
    * **[-st-mixin](./mixin-syntax.md)**: apply mixins to CSS ruleset
    * **[-st-variant](./variants.md)**: apply pre-made look and feel
* **selectors**
    * **[Pseudo-elements](./pseudo-elements.md)**: `::X` target internal part 
    * **[Pseudo-classes](./pseudo-classes.md)**: `:X` target state
    * **[Custom selectors](./custom-selectors)**: `:--X` selector shortcut
    * **[Global selectors](./global-selectors)**: `:global(X)` keep selector global - not scoped
