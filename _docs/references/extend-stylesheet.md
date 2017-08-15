# Extend Stylable stylesheet

Use the `-st-extends` directive rule to extend a CSS class with another stylesheet, in order to be able to describe styling of [pseudo classes](./pseudo-classes.md) and [pseudo elements](./pseudo-elements.md) of the extended stylesheet.

> *Note*: `-st-extends` may only be applied to [class selector](./class-selectors.md) and [root selector](./root.md).

### CSS API:
```css
@namespace "ToggleButton"
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

### CSS OUTPUT:
```css
/* namespaced to the stylesheet */
.ToggleButton__root .check-btn.toggle-button__root{ background:white;}
.ToggleButton__root .check-btn.toggle-button__root .toggle-button__label{ color:green; }
.ToggleButton__root .check-btn.toggle-button__root[data-toggle-button-toggled] .toggle-button__label{ color:red; }
```

### React
```jsx
/* ToggleButton component implements toggle-button.css */
import ToggleButton from './toggle-button';
/* inside a stylable render */
<div>
    <ToggleButton className="check-btn" />
</div>
```
