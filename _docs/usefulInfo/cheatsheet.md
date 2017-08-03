# Cheatsheet

 ## CSS - [CSS Syntax Docs](https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Syntax#CSS_Declarations)

 * **simple selector**: type selector, class selector (+Stylable [root class](./root.md))
 * **CSS property**: name of the rule (for example, "color")
 * **CSS declaration**: CSS property paired with a value
 * **CSS declaration block**: List of CSS declarations
 * **CSS ruleset**: CSS declaration block paired with a selector

## Stylable - [Stylable Docs](www.stylable.io) 
Syntax unique to Stylable

 * **Directives** `-st-*` Instructions for the **Stylable** pre-processor, removed during transpilation
    * [**`-st-extends`**](../references/extend-stylesheet.md) simple selector base class extending from another stylesheet
    * [**`-st-states`**](../references/pseudo-classes.md) define custom pseudo-classes
    * [**`-st-mixin`**](../references/mixin-syntax.md) apply mixins to CSS ruleset
    * [**`-st-variant`**](../references/variants.md) define pre-made look and feel that are ignored if not in use
* **Selectors**
    * [**`::<class name>`**](../references/pseudo-elements.md) target internal part of a component (pseudo-element) 
    * [**`:<class name>`**](../references/pseudo-classes.md) target states - pseudo-classes
    -* [**`:--<class name>`**](../references/custom-selectors.md) selector shortcut (custom selector)-
    * [**`:global(<class name>)`**](../references/global-selectors.md) keep selector global and not scoped to the stylesheet
* **Imports** [**`:import {}`**](../references/imports.md) Import external assets like mixins, stylesheets and variants
    * [**`-st-from`**](../references/imports.md) location of file to import
    * [**`-st-default`**](../references/imports.md) import default export
    * [**`-st-named`**](../references/imports.md) import named exports
* [**`@namespace <readable name>;`**](../references/namespace.md) identify stylesheets to improve development


*Option w/ tables*

## CSS

| **CSS**  |[CSS Syntax Docs](https://developer.mozilla.org/en-US/docs/Learn/CSS/Introduction_to_CSS/Syntax#CSS_Declarations)  |
|---|---|
|**simple selector**   |Type selector, class selector (+Stylable [root class](./root.md))   |
|**CSS property**   | Name of the rule (for example, "color")  |
| **CSS declaration**  | CSS property paired with a value  |
|**CSS declaration block**   |  List of CSS declarations  |
|**CSS ruleset** | CSS declaration block paired with a selector
<br>  
<br>

## Stylable 

[Stylable Docs Site](www.stylable.io)

Syntax unique to Stylable - Click each to access code examples and descriptions in GitHub
  
| Directives | Syntax  |  Description |
|---|---|---|
||**`-st-`**|Instructions for the **Stylable** pre-processor, removed during transpilation|
|[Extend stylesheet](../references/extend-stylesheet.md)|**`-st-extends`**   | Simple selector base class extending from another stylesheet  |
|[State](../references/pseudo-classes.md)| **`-st-states`** | Define custom pseudo-classes  |
|[Mixin](../references/mixin-syntax.md) | **`-st-mixin`**   | Apply mixins to CSS ruleset  |
|[Variant](../references/variants.md) |**`-st-variant`**    | Define pre-made look and feel that are ignored if not in use  |
<br>

|Selectors   | Syntax  | Description  |
|---|---|---|
|[Pseudo-element](../references/pseudo-elements.md) | **`::<class name>`**  | Target internal part of a component |
|[Pseudo-class](../references/pseudo-classes.md) | **`:<class name>`**  | Target states including native and custom pseudo-classes |
| [Global](../references/global-selectors.md) | **`:global(<class name>)`**| Keep selector global and not scoped to the stylesheet  |
 <br> 

| Imports  | Syntax  | Description  |
|---|---|---|
|[Import](../references/imports.md)|**`:import {}`**   | Import external assets like mixins, stylesheets and variants|
|[File name](../references/imports.md)  | **`-st-from`**  | Location of file to import  |
|[Default value](../references/imports.md)   | **`-st-default`**  |Import the file's default export value   |
|[Named value](../references/imports.md)   | **`-st-named`**  | Import the file's named export value or values  |
<br>

|Namespace|Syntax|Description|
|---|---|---|
|Namespace|**`@namespace <readable name>:`**| Identify stylesheets to improve development|




