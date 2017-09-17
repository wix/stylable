---
id: references/extend-stylesheet
title: Extend Stylable Stylesheet
layout: docs
---

Use the `-st-extends` directive rule to extend a CSS class with another stylesheet. This enables you to style [pseudo classes](./pseudo-classes.md) and [pseudo elements](./pseudo-elements.md) of the extended stylesheet.

> **Note**  
>`-st-extends` can be applied only to [class selectors](./class-selectors.md) and a [root selector](./root.md).

In this example, the stylesheet is extending the `toggle-button.css` stylesheet. The `check-btn` class has a `label`, which is a custom pseudo-element, and can be `toggled`, a custom pseudo-class. 

```css
/* page.st.css */
@namespace "Page";
:import {
    -st-from: "./toggle-button.st.css";
    -st-default: ToggleButton;
}
.check-btn {
    -st-extends: ToggleButton;
    background: white;
}
.check-btn::label { color:green; } /* style pseudo element label */
.check-btn:toggled::label { color:red; } /* style pseudo element label when check-box is toggled */
```

```css
/* CSS output*/
.Page__root .Page__check-btn.ToggleButton__root { background: white; }
.Page__root .Page__check-btn.ToggleButton__root .ToggleButton__label { color: green; }
.Page__root .Page__check-btn.ToggleButton__root[data-ToggleButton-toggled] .ToggleButton__label { color: red; }
```

```jsx
/* React - Page component uses toggle-button component */
import ToggleButton from './toggle-button';
/* inside a stylable render */
<div>
    <ToggleButton className="check-btn" />
</div>
```
