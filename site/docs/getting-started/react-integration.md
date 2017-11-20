---
id: getting-started/react-integration
title: React Integration
layout: docs
---

**Stylable** is easily integrated with React components. 

We offer a [custom react integration](#automatic-integration-with-wix-react-tools) that adds typescript and runtime support helpers that make defining stylable-react components easy.  

However you are more then welcome to manually integrate it or build your own helpers.

## Manual Integration 

First read the [Runtime guide](../guides/runtime.md) to understand the stylable runtime API.

To manualy integrate stylable to a React component, you **must** first mark the root element of the component:

```jsx
import style from "style.st.css";

class Comp extends React.Component {
    render() {
        return (
            <div { ...style('root', { stateA:true, stateB:false }, this.props) }></div>
        );
    }
}
```

This generates and add the props needed to define the root element for styling:
* Mark component root by setting the root target `className`
* Set component states using `data-*` attributes 
* Append `className` override from component props to the root `className`
* Custom or overriden component states are added from external `data-*` props

> Note:  
> We recommend passing the props `className` and `data-*` in order to enable external styling. To make the component more stylable, we believe it is best to also merge the `style` prop.

Any other node can be marked directly with the class mapping and the [$cssStates](../guides/runtime#custom-state-mapping) function:

```jsx
import style from "style.st.css";

class Comp extends React.Component {
    render() {
        return (
            <div { ...style('root', {}, this.props) }>
                <span className={style.label} { ...style.$cssStates({ stateA:true }) }></span>
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
