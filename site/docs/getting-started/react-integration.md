---
id: getting-started/react-integration
title: React Integration
layout: docs
---

**Stylable** integrates with React components using our [custom React integration](#automatic-integration-with-wix-react-tools). The integration adds TypeScript and runtime support helpers so you can define your own stylable-react-components.  

If you don't use the custom integration, you can manually integrate **Stylable** with a React component as described below. You can also build your own helpers.

## Manual Integration 

Before you begin, read the [Runtime guide](../guides/runtime.md) to understand the **Stylable** runtime API.

To manualy integrate **Stylable** to a React component, you **must** first mark the root element of the component:

```jsx
import style from "style.st.css";

class Comp extends React.Component {
    render() {
        return (
            <div { ...style('root', { stateA: true, stateB: false }, this.props) }></div>
        );
    }
}
```

The result of the above generates and adds the props needed to define the root element for styling:
* Marks component root by setting the root target `className`
* Sets component states using `data-*` attributes 
* Appends `className` override from component props to the root `className`
* Custom or overriden component states are added from external `data-*` props

> **Note**  
> To enable external styling, we recommend passing the props `className` and `data-*`. To make the component more stylable, we also recommend also merging the `style` prop.

All nodes, other than `root`, can be marked directly with the class mapping and the [$cssStates](../guides/runtime#custom-state-mapping) function:

```jsx
import style from "style.st.css";

class Comp extends React.Component {
    render() {
        return (
            <div { ...style('root', {}, this.props) }>
                <span className={style.label} { ...style.$cssStates({ stateA: true ) }></span>
            </div>
        );
    }
}
```
 
## Automatic integration with Wix React Tools

Use **Stylable** React integration from [wix-react-tools](https://github.com/wix/wix-react-tools) to set a **Stylable** stylesheet for a React component or stateless functional component (SFC).


Install **wix-react-tools** as a dependency in your local project.

Using npm:
```bash
npm install wix-react-tools --save
```

Using yarn:
```bash
yarn add wix-react-tools
```

### Use

When applying **Stylable** to a React component, any `className` or `data-*` properties are copied to the resulting root element of the component. Further, the [root class](../references/root.md) of the stylesheet is added to the root element automatically.

```jsx 
import {stylable} from 'wix-react-tools';
import stylesheet from './style.st.css'

// Decorate class
@stylable(stylesheet)
class Comp extends React.Component {...}

// Class without decorator
stylable(stylesheet)(class Comp extends React.Component {...});

// SFC
stylable(stylesheet)(props => {...});
```

#### CSS classes

All [CSS class selectors](../references/class-selectors.md) that are in the stylesheet can be applied to any element **in the render** through the `className` property.

```jsx 
@stylable(stylesheet)
class Comp extends React.Component {
    render() {
        return (
            <div>
                <div className="item" />
            </div>
        );
    }
}
```

#### Custom states

**Stylable** offers [custom states](../references/pseudo-classes.md) that can be defined on any CSS class selectors. Add a `style-state` property to any element to control whether to enable a custom state or not.  

```jsx 
@stylable(stylesheet)
class Comp extends React.Component {
    render() {
        return <div style-state={ {"a": true, "b": false} } >
            <div style-state={ {"x": true, "y": false} } />
        </div>;
    }
}
```
