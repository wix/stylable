---
id: references/root
title: Root
layout: docs
---

Every Stylable stylesheet has a reserved class called `root` that matches the root node of the component.

The `root` class is used to signify a rendering component top-level where a new  scope of namespacing is created. Each component is responsible for placing the `root` class on its top-level node for itself.

You can apply default styling and behavior to the component on the root class itself.

If the root class exists and is being used, all other classes defined in the stylesheet are assumed to be nested under the `root` class (at any depth).

## Examples

```css
/* CSS */
@namespace "Comp";
.root { background: red; } /* set component background to red */
```

```css
/* CSS output*/
.Comp__root { background: red; }
```

The `root` class name can be applied to a component node by using our [React integration](../getting-started/react-integration.md).

```js
/* comp.jsx */
import React from 'react';
import { style, classes } from './comp.st.css';

class Comp extends React.Component {
    render () {
        return (
            <div className={style(classes.root, {}, this.props.className)} />
        );
    }
}
```

> **Note**    
> Root can also define [states](./pseudo-classes) and [extend another component](./extend-stylesheet.md).
