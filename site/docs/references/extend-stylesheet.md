---
id: references/extend-stylesheet
title: Extend Stylable Stylesheet
layout: docs
---

Use the `-st-extends` directive rule to extend a CSS class with another stylesheet. This enables you to style [pseudo-classes](./pseudo-classes.md) and [pseudo-elements](./pseudo-elements.md) of the extended stylesheet.

> **Note**  
>`-st-extends` can be applied only to [class selectors](./class-selectors.md) and [root](./root.md).

In this example, the stylesheet is extending the `toggle-button.css` stylesheet. The `checkBtn` class has a `label`, which is a custom pseudo-element, and has a custom pseudo-class, `toggled`. 

```css
/* page.st.css */
@namespace "Page";
:import {
    -st-from: "./toggle-button.st.css";
    -st-default: ToggleButton;
}
.checkBtn {
    -st-extends: ToggleButton;
    background: white;
}
.checkBtn::label { color:green; } /* style pseudo element label */
.checkBtn:toggled::label { color:red; } /* style pseudo element label when check-box is toggled */
```

```css
/* CSS output*/
.Page__root .Page__checkBtn.ToggleButton__root { background: white; }
.Page__root .Page__checkBtn.ToggleButton__root .ToggleButton__label { color: green; }
.Page__root .Page__checkBtn.ToggleButton__root[data-ToggleButton-toggled] .ToggleButton__label { color: red; }
```

```jsx
/* React - Page component uses toggleButton component */
import ToggleButton from './toggle-button';
/* inside a stylable render */
<div>
    <ToggleButton className="checkBtn" />
</div>
```
