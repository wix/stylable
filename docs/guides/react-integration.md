# React integration

Use [Stylable React integration](https://github.com/wix/wix-react-tools/blob/master/docs/react-component-features/stylable.md) from `wix-react-tools` in order to set a stylable stylesheet for a React component or stateless functional component (SFC).


## Installation

Install **wix-react-tools** as a dependency in your local project

Using npm:
```bash
npm install wix-react-tools --save
```

Using yarn:
```bash
yarn add wix-react-tools
```

## Use

When applying Stylable to a React component, any className or `data-*` properties are copied to the resulting root element of the component. Further more the [root class](../references/root.md) of the stylesheet is added to the root element automatically.

```jsx 
import {stylable} from 'wix-react-tools';
import stylesheet from './style.css'

// Class
@stylable(stylesheet)
class Comp extends React.Component {...}

// SFC
@stylable(stylesheet)(props => {...});
```

### CSS classes

All [CSS class selectors](../references/class-selectors.md) existing in the stylesheet can be applied to any element **in the render** through the `className` property.

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

Stylable offers [custom states](../references/pseudo-classes.md) that can be defined on any CSS class selectors. Add a `style-state` property to any element in order to control if a certain custom state is enabled or not.  

```jsx 
@stylable(stylesheet)
class Comp extends React.Component {
    render() {
        return <div style-state={{a: true, b: false}} >
            <div style-state={{x: true, y: false}} />
        </div>
    }
}
```

## Other Stylable integrations (future)

* Polymer - web-components with shadow DOM transformer
* Document - expose JS api to manage selectors state and dynamic updates
