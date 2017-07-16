# Extend Stylable stylesheet

Use the `-sb-extends` rule to extend a CSS class with another stylesheet in order to be able to describe styling of [pseudo classes](seudo-classes.md) and [pseudo elements](./pseudo-elements.md) of the extended stylesheet.

CSS API:

```css
:import{
    -sb-from: "./toggle-button.css";
    -sb-default: ToggleButton;
}
.check-btn{
  -sb-extends:ToggleButton;
  background:white;
}
.check-btn::label{ color:green; }
.check-btn:toggled::label{ color:red; }
```
JS API:

```js
import ToggleButton from './toggle-button.css';
Stylesheet.fromCSS(`
    :import{
        -sb-from: ${ToggleButton};
        -sb-default: ToggleButton;
    }
    .check-btn{
        -sb-extends:ToggleButton;
        background:white;
    }
    .check-btn::label{ color:green; }
    .check-btn:toggled::label{ color:red; }
`);
```
CSS OUTPUT:

```css
/* namespaced to the stylesheet */
.root .check-btn.toggle-button_root{ background:white;}
.root .check-btn.toggle-button_root .toggle-button_label{ color:green; }
.root .check-btn.toggle-button_root[data-toggle-button-toggled] .toggle-button_label{ color:red; }
```
React

```jsx
/* ToggleButton component implements toggle-button.css */
import ToggleButton from './toggle-button';
/* inside a stylable render */
<div>
    <ToggleButton className="check-btn" />
</div>
```
