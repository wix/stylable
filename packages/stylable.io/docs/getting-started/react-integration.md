---
id: getting-started/react-integration
title: React Integration
layout: docs
---

You can manually integrate **Stylable** with a React component as described below. You can also build your own helpers.

Before you begin, read the [Runtime guide](../guides/runtime.md) to understand the **Stylable** runtime API.

To manualy integrate **Stylable** to a React component, you **must** first mark the root element of the component:

```js
import { style, classes } from "style.st.css";

class Comp extends React.Component {
    render() {
        return (
            <div className={style(
                classes.root, 
                { stateA: true, stateB: false },
                this.props.className
            )}></div>
        );
    }
}
```

The result of the above generates and adds the props needed to define the root element for styling:
* Marks component root by setting the root target `className`
* Sets component states using generated class names 
* Appends `className` override from component props to the root `className`
* Custom or overridden component states are added via additional class names

> **Note**  
> To enable external styling, we recommend passing the `className` prop. To make the component more stylable, we also recommend also merging the `style` prop.

All nodes, other than `root`, can be marked directly with the class mapping and the [$cssStates](../guides/runtime#custom-state-mapping) function:

```js
import { style, classes, cssStates } from "style.st.css";

class Comp extends React.Component {
    render() {
        return (
            <div className={style(classes.root, {}, this.props.className) }>
                <span className={classes.label} >
                    Text
                </span>
                <span className={cssStates({ stateA: true })} >
                    More Text
                </span>
            </div>
        );
    }
}
```
 

