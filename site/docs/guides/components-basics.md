---
id: guides/components-basics
title: Component Basics
layout: docs
---

This guide walks you through the basics of how to style and work with components using **Stylable**. 

You use **Stylable** with a component file (for example using React), along with a **Stylable** CSS file that has the extention `.st.css`.

> **Note**:  
> This guide shows the JSX side of our [stylable-integration](https://github.com/wixplosives/stylable-integration) with React. 

**Stylable** styles are similar to a type-system. Once you have declared that a CSS class is of the type `Button` for example, **Stylable** knows its internal structure and can match its internal parts and states.

Whether creating your own components or using components you imported from a 3rd party, you want to be able to access and style the internal parts of every component in the scope of your page or application. 


## 1. Style a component 

Let's say you have a `Button` component with a render function per this example. You can style its JSX using the `className` property.

```jsx
/* button.ts */
render () {
    return (
        <button>
            <div className="icon"/>
            <span className="label">Submit</span>
        </button>
    );
}
```

Now in the component's **Stylable** CSS file called `button.st.css`, you can declare each of the classes as a ruleset as follows:

```css
/* button.st.css */

/* 
note that the root class is automatically placed on the root HTML 
element by Stylable React integration 
*/
.root { 
    background: #b0e0e6;
}
.icon {
    background-image: url('./assets/btnIcon.svg');
}
.label {
    font-size: 1.2em;
    color: rgba(81, 12, 68, 1.0)
}
```

## 2. Expose the component's Stylable API

When using **Stylable**, every component exposes an API that's usable by its parent components.

The API includes:

* **Pseudo-elements**: any HTML element that has the className attribute, and is therefore exposed via a [pseudo-element](../references/pseudo-elements.md).
 
* **Pseudo-classes**: any state connected to the component logic, and declared as a [pseudo-class](../references/pseudo-classes.md).

Let's see how to create your own parts and states and expose them for use throughout a page or application.

### A. Create and expose internal parts

In the example above, you created a very simple button component. Now let's [import](../references/imports.md) this button into a `Panel` component. The classes that you created above are available as pseudo-elements of the imported component.

You can now style your `Button` in the scope of the `Panel` so that it fits its needs.

Let's take the `Button` component and import it into the JSX file, and also add it to the render:

```jsx
/* panel.jsx */
import * as React from 'react';
import {properties, stylable} from 'wix-react-tools';
import {Button} from '../button';
import style from './panel.st.css';

export const Panel: React.SFC = stylable(style)(properties(() => (
    <div>
        <Button />
    </div>
)));
```

Let's also import `Button`'s stylesheet into the `Panel` stylesheet. You can then target the internal parts of the component that you imported:

```css
/* panel.st.css */
:import {
    -st-from: './button.st.css';
    -st-default: Button;
}
/* cancelBtn is of type Button */
.cancelBtn { 
    -st-extends: Button;
    background: cornflowerblue;
}
/* targets the label of <Button className="cancelBtn" /> */
.cancelBtn::label { 
    color: honeydew;
    font-weight: bold;
}
```

### B. Create and expose states

You can also create custom states for the component that are available as [pseudo-classes](../references/pseudo-classes.md) to anyone using your component.

A custom pseudo-class can be used to reflect any logical state of your component. For example, your `Button` has a property called `on`. In this example, it is toggled when the button is clicked.

```jsx
/* button.jsx */
render () {
    return (
        <button 
            style-state={ {on: this.state.on} }
            onClick={()=>this.setState({on:!this.state.on})}
        >
            <div className="icon"/>
            <span className="label">Click Here!</span>
        </button>
    );
}
```

```css
/* button.st.css */
.root {
    -st-states: on;
    background: #b0e0e6;
}
.icon {
    background-image: url(./assets/btnIcon.svg);
}
.label {
    font-size: 1.2em;
    color: rgba(81, 12, 68, 1.0)
}
/* targets the state on the root of the component */
.root:on { 
    box-shadow: 2px 2px 2px 1px darkslateblue;
}
```

You can then target `Button`'s `on` state in your `panel` as follows:

```css
/* panel.st.css */
.cancelBtn {
    background: cornflowerblue;
}
.cancelBtn:on {
    box-shadow: 2px 2px 2px 1px indigo;
}
```

## See also:

* [Building an Application](./stylable-application.md)
* [Building a Component Library](./stylable-component-library.md)
* [Stylable Cheatsheet](../getting-started/cheatsheet.md)
