# Project Commons

The goal of the project file is to contain the CSS commons for the project, including [variables](../references/variables.md), [component variants](./component-variants.md) and [shared class](./shared classes.md).

In the following code we are describing a project with:
 * 2 colors and 2 font sizes variables 
 * 1 `Button` component variant named `cancelButton` 
 * 1 shared class for `emphasisBox`

```css
/* project.st.css */
@namespace "Project";
:vars {
    color1: #F012BE;
    color2: #FF4136;
    fontBig: 30px;
    fontSmall: 10px;
}
:import {
    -st-from: './button/button.st.css';
    -st-default: Button;
}
.cancelButton {
    -st-extends: Button;
}
.emphasisBox {}
```

> **Notice**:
> It's recommended to call the project commons file `project.st.css`.