---
id: getting-started/react-integration
title: React integration
layout: docs
---

## Manual integration 

To integrate **Stylable** with your project, follow these four steps. Each enables a different feature as described.

1. Enable a component to inherit states at the [root](references/root) level by passing parent data-* to your root node.
2. Enable style overrides by adding the parent className to your root node.
3. Enable custom CSS states by generating data-* from your stylesheet.
4. Enable scoped styling by putting the root class on your root node. 

The result of step 2 plus step 4 is `className` concatenation. To access the local class names, you must import the stylesheet into your component file and reference the `className` field.

```jsx
    ...
    import style from "style.st.css";
    
    class Comp extends React.Component {
        render() {
            return (
                <div                    
                    {...this.props}  //this will enable shared root states
                    
                    {...style.$stylesheet.cssStates({on: this.state.on})} // this will enable custom css states.
                    
                    className={[style.root, this.props.className].join(' ')}  // this will enable styling and overrides
                >                    
                    <div className={style.item} />
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
