# Extend Stylable stylesheet

Use the `-st-extends` directive rule to extend a CSS class with another stylesheet, in order to be able to describe styling of [pseudo classes](./pseudo-classes.md) and [pseudo elements](./pseudo-elements.md) of the extended stylesheet.

> *Note*: `-st-extends` may only be applied to [class selector](./class-selectors.md) and [root selector](./root.md).

### CSS API:
```css
/* page.st.css */
@namespace "Page"
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
.Page__root .Page__root.check-btn.ToggleButton__root{ background:white;}
.Page__root .Page__root.check-btn.ToggleButton__root .ToggleButton__label{ color:green; }
.Page__root .Page__root.check-btn.ToggleButton__root[data-toggle-button-toggled] .ToggleButton__label{ color:red; }
```

### React
```jsx
/* CheckButton component implements toggle-button.css */
import ToggleButton from './toggle-button';
/* inside a stylable render */
<div>
    <ToggleButton className="check-btn" />
</div>
```
