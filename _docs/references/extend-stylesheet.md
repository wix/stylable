# Extend Stylable stylesheet

Use the `-st-extends` directive rule to extend a CSS class with another stylesheet. This enables you to style [pseudo classes](./pseudo-classes.md) and [pseudo elements](./pseudo-elements.md) of the extended stylesheet.

> **Note**: `-st-extends` can be applied only to [class selectors](./class-selectors.md) and [root selector](./root.md).

In this example, this stylesheet is extending the `toggle-button.css` stylesheet. The `.check-btn` class has a `label`, a custom [pseudo-element](./pseudo-elements.md), and can be `toggled`, a custom [pseudo class](./pseudo-classes.md).

CSS API:

```css
:import{
    -st-from: "./toggle-button.css";
    -st-default: ToggleButton;
}
.check-btn{
  -st-extends:ToggleButton;
  background:white;
}
.check-btn::label{ color:green; } /* style pseudo element label */
.check-btn:toggled::label{ color:red; } /* style pseudo element label when check-box is toggled */
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
