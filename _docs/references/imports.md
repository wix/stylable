# Imports

**Stylable** enables you to import other stylesheets and modules in a way that is similar to [JS Imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import). You can then use the stylesheet or module as it's been defined, or just one or more of its named values, in your own **Stylable** stylesheet.

You use the **Stylable** syntax beginning with `-sb-` for the  `:import` config:

 * `-sb-from:` Identifies the path to the stylesheet or JavaScript module. Can be a relative path or a 3rd party path.
 * `-sb-default:` Imports the default export of the module named in ```-sb-from:```. Use with the name by which to identify the imported value in the scoped stylesheet.
 * `-sb-named:` List of the named exports to import into the local scoped stylesheet from the file named in `-sb-from:`.

 > Note:
 > * `:import` is a Stylable directive and not a selector.
 > * Using `import` as part of a complex selector or inside a CSS ruleset does not import.
 > * Multiple imports may conflict and the last one in the file wins.

 ## Examples:

#### Import the default export of a local reference stylesheet for use in the scoped stylesheet

Import the `toggle-button.css` stylesheet from a local location. Assign the name `ToggleButton` to the default export of that stylesheet for use in this scoped stylesheet.

```css
 :import{
    -sb-from:"./toggle-button.css";
    -sb-default: ToggleButton;
 }
 ```

ES6 equivalent
 ```js
 import ToggleButton from "./toggle-button.css";
 ```

 #### Import named exports from a local JS module

The values `Gallery` and `Menu` are imported from the local JavaScript module `my-components`. These named exports are now imported into this scoped stylesheet.

 ```css
 :import{
    -sb-from:"./my-components";
    -sb-named: Gallery, Menu;
 }
 ```

 ES6 equivalent
 ```js
 import { Gallery, Menu } from "./my-components";
 ```

 #### Import named exports from a local JS module and locally refer to one of the export values as a different name

The values `Menu` and `Gallery` are imported from the local JavaScript module ```my-components```. `Menu` is used as is and `Gallery` has been renamed for use in this scoped stylesheet as `ProductGallery`. These components should be referred to as ```Menu``` and `ProductGallery` in this stylesheet.

 ```css
 :import{
    -sb-from:"./my-components";
    -sb-named: Menu, Gallery as ProductGallery;
 }
 ```

  ES6 equivalent
 ```js
 import { Menu, Gallery as ProductGallery } from "./my-components";
 ```

 ## Usage:
  * [Tag selectors](./tag-selectors.md)
  * [Extend a stylesheet](./extend-stylesheet.md)
  * [Mixins](./mixin-syntax.md) and [Variants](./variants.md)
