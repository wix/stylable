# Stylable Component Basics

This guide will walk you through the basics of styling components with **Stylable** and understand the basics of working with them. 

## Styling A Component 

Let's assume we have a `Button` component with a render function like this, we can style its different nodes using the `className` attribute.

```jsx
/* button.ts */
render() {
    <button className="root">
        <icon className="btnIcon"/>
        <label className="btnLabel"/>
    </button>
}
```

And in the component's Stylable CSS file `button.st.css` we will declare this:

```css
/* button.st.css */
.root {
    background: #b0e0e6;
}
.btnIcon {
    background-image: url(./assets/btnIcon.svg);
}
.btnLabel {
    font-size: 16px;
    color: rgba(81, 12, 68, 1.0)
}
```

## Exposing the Component Stylable API

Every **Stylable** component exposes an API that's usable by parent components.

The API includes:
* The component's internal parts, any HTML element that has the className attribute, and is therefore exposed via a [stylable pseudo-elements](../references/pseudo-elements.md).
* The component's custom states, any state declared and connected to the component logic, and then styled to appear differently using [stylable pseudo-classes](../references/pseudo-classes.md).

### Creating and Exposing Internal Parts

In the example above, we created a very simple button component. Now we [import](../references/imports.md) this button into our `Form` component, and the classes that we created are available to us as internal parts of the component we import. We can then style it in the scope of our `Form` to fit our needs.

We will take the `Button` component import it into our TypeScript file:

```jsx
import {Button} from './button.ts'

render() {
    return ( 
        <div className="root">
            <Button className="formBtn">
        </div>
    );
}
```

We will also import its Stylable CSS into our CSS, and be able to match internal parts of the component we imported:

```css
/* form.st.css */
:import {
    -st-from: './button.st.css';
    -st-default: Button;
}
.root {
    background: floralwhite;
}
.formBtn {
    -st-extends: Button;
    background: cornflowerblue;
}
.formBtn::btnLabel {
    color: honeydew;
    font-weight: bold;
}
```

### Creating and Exposing States

In our component we can also create custom states that will be available to anyone using our component.

```css
/* button.st.css */
.root {
    -st-states: clicked;
    background: #b0e0e6;
}
.btnIcon {
    background-image: url(./assets/btnIcon.svg);
}
.btnLabel {
    font-size: 16px;
    color: rgba(81, 12, 68, 1.0)
}
.root:clicked { /* places the state on the root of the component */
    box-shadow: 2px 2px 2px 1px darkslateblue;
}
```

We can then match this state of `Button` in our `Form` this way:

```css
/* form.st.css */
:import {
    -st-from: './button.st.css';
    -st-default: Button;
}
.myForm {
    background: floralwhite;
}
.formBtn {
    -st-extends: Button;
    background: cornflowerblue;
}
.formBtn:clicked {
    box-shadow: 2px 2px 2px 1px indigo;
}
```

## Further Reading

* [Stylable Imports](./stylable-imports-guide.md)
* [Stylable Theming](./stylable-theming-guide.md)
