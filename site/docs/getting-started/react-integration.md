---
id: getting-started/react-integration
title: React Integration
layout: docs
---

If you want to understand the workings of the integration, you can integrate **Stylable** manually with a React component per the following example. You can also use our automatic integration using **wix-react-tools** as described below.

## Manual integration 

To integrate **Stylable** with a React component, the imported stylesheet can be run as a function on the root node and it contains the local classes, variables and keyframes. The function receives the following optional arguments:

* `className` - string
* `stateMap` - an object where every key is the state name and the value is boolean to turn the state on or off
* `props` - original props that were provided to the component and these should be passed only to the root node

```jsx
    ...  
    import style from "style.st.css";
    
    class Comp extends React.Component {
        render() {
            return (
                <div {...style('', {on: this.state.on}, this.props)}>                    
                    <div {...style('item', {})}></div>
                    <div className={style.item}></div>
                </div>
            );
        }
    }
```
Once this is run, the following is enabled for your component:
* Scoped styling by putting the root class on your root node. 
* A component can inherit states at the [root](references/root) level by passing parent data-* to your root node.
* Parent className overrides by appending the `this.props.className` to your root node.
* Custom CSS states by generating data-* from your stylesheet.
 
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

## Use

When applying **Stylable** to a React component, any className or `data-*` properties are copied to the resulting root element of the component. Further, the [root class](../references/root.md) of the stylesheet is added to the root element automatically.

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

> **Note**  
> There is a [bug](https://github.com/wix/wix-react-tools/issues/107) in `cloneElement`. It does not apply the same abilities as `createElement`.

### CSS classes

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

### Custom states

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
