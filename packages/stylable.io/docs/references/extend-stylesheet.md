---
id: references/extend-stylesheet
title: Extend Stylable Stylesheet
layout: docs
---

Use the `-st-extends` directive rule to extend a CSS class with another stylesheet. This enables you to style [pseudo-classes](./pseudo-classes.md) and [pseudo-elements](./pseudo-elements.md) of the extended stylesheet.

> **Note**  
>`-st-extends` can be applied only to [class selectors](./class-selectors.md) and [root](./root.md).

In this example, the stylesheet is extending the `toggle-button.st.css` stylesheet. The `checkBtn` class has a `label`, which is a custom pseudo-element, and has a custom pseudo-class, `toggled`. 

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
.checkBtn::label { color: green; } /* style pseudo element label */
.checkBtn:toggled::label { color: red; } /* style pseudo element label when check-box is toggled */
```

```css
/* CSS output*/
.Page__checkBtn { background: white; }
.Page__checkBtn .ToggleButton__label { color: green; }
.Page__checkBtn.ToggleButton--toggled .ToggleButton__label { color: red; }
```

```js
/* page.jsx */
import React from 'react';
import { style, classes } from './comp.st.css';

import ToggleButton from './toggle-button';

class Page {
    constructor(props) {
        super(props);
    }

    render () {
        return (
            <div className={style(classes.root, this.props.className) }>
                <ToggleButton className={classes.checkBtn} />
            </div>
        );
    }
}
```

## Extending stylesheets vs. classes

Stylable offers you the ability to import a stylesheet (default import) or class (named import). The two methods differ in their runtime export values.

### Extending a root

When extending a `root` class, Stylable assumes the component itself will place its own `root` class, and as such Stylable exports only the local className during runtime. 

The extended component will receive the extending (external) class name through its props and concat it to the `root` node class list.

### Extending an inner part

Any class other than `root` defined in a Stylesheet is considered an inner part. Usually in Stylable extending a class signifies the use of a [variant](../guides/component-variants.md) or composed* utility class.

\* - Stylable currently does not support composing multiple classes on the same part. We hope to introduce this capability in the near future.

### Extending example

```css
/* page.st.css */
@namespace "Page";
:import {
    -st-from: "./toggle-button.st.css";
    -st-default: ToggleButton;
}
:import {
    -st-from: "./toggle-button-variant.st.css";
    -st-named: toggleVariant;
}

.defaultCheckBtn {
    -st-extends: ToggleButton; /* extending stylesheet */
}
.variantCheckBtn {
    -st-extends: toggleVariant; /* extending class */
}
```

```css
/* CSS output*/
.Page__defaultCheckBtn {}
.Page__variantCheckBtn {}
```

```js
/* runtime JS output*/
import { classes } from './page.st.css';

console.log(classes.defaultCheckBtn) // "Page__defaultCheckBtn"
console.log(classes.variantCheckBtn) // "Page__variantCheckBtn ToggleButton__toggleVariant"
```
