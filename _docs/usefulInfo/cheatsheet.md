# Stylable Cheatsheet

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
|[Global](../references/global-selectors.md) | **`:global(<class name>)`**| Keep selector global and not scoped to the stylesheet  |
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




