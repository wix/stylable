---
id: getting-started/react-integration
title: React integration
layout: docs
---

Use Stylable React integration from [wix-react-tools](https://github.com/wix/wix-react-tools) to set a **Stylable** stylesheet for a React component or stateless functional component (SFC).


## Installation

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

## Other Stylable integrations (future)

* Polymer - web-components with shadow DOM transformer
* Document - expose JS API to manage selector states and dynamic updates
