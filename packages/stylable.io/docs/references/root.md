---
id: references/root
title: Root
layout: docs
---

Every Stylable stylesheet has a reserved class called `root` that matches the root node of the component. 

You can apply default styling and behavior to the component on the root class itself.

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
import * as React from 'react';
import style from './comp.st.css';

class Comp {
    constructor(props) {
        super(props);
    }

    render () {
        return (
            <div { ...style("root", {}, this.props) } />
        );
    }
}
```

> **Note**    
> Root can also define [states](./pseudo-classes) and [extend another component](./extend-stylesheet.md).
