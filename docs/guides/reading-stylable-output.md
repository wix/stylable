# How to Understand Stylable Output

For advanced CSS users, it's useful to be able to read **Stylable** output to understand what is affecting a specific element and to debug if necessary. You want to be able to see what has been applied, and connect it to specific declarations in the code.

## Basics of Namespacing

**Stylable** automatically [namespaces](../references/namespace.md) all style rules, to scope each component and prevent styles from "leaking" into other components. The CSS output displays a generated string based on its file name to namespace it.

Components also reflect their source component, relative to from where they were scoped. For example in the following code example, the selector gets underscore root (`__root`) because it was scoped to the root class. 

### CSS:
```css
.some-class {}
```

### CSS Selector: 
```css
.<filename>__root .<filename>__some-class
```

### JS value: 
```js
<filename>CSS["some-class"] === "<filename>__some-class"
```

You can declare a specific namespace for your component, to more easily track it. In the example below, when you declare the namespace `ToggleBtn`, the CSS output reflects the namespacing so you can identify it in the output.

### CSS:
```css
@namespace "ToggleBtn";
.some-class {}
```

### CSS Selector: 
```css
.ToggleBtn__root .ToggleBtn__some-class
```

### JS value: 
```js
ToggleBtnCSS["some-class"] === "ToggleBtn__some-class"
```

## Imports 

Let's continue with the `ToggleBtn` component that is now [imported](../references/imports.md) into our example. Here the component is namespaced and the sections following describe the different ways to import the component.

### CSS:
```css
/* toggle-btn.st.css */
@namespace "ToggleBtn";
.root {
    -st-states: toggled;
}
.checkBox { color:red; }
.highContrast { color:green; }
:vars {
    color1: blue;
}
```

### Default Imports

Let's examine the differences between using [tag-selectors](../references/tag-selectors.md) and [class-selectors](../references/class-selectors.md) when importing a namespaced component. The tag selector is scoped to the component itself, whereas the class selector is scoped to the local stylesheet.

#### CSS:
```css
@namespace "Page";
:import {
    -st-from: './toggle-btn.st.css';
    -st-default: ToggleBtn;
}
```

#### Tag Selectors

**CSS**: 
```css
ToggleBtn {} 
```

**CSS Selector**: 
```css
.Page__root .ToggleBtn__root
```

**JS value**: 
```js
/* tag selectors are not exported */
```

#### Tag Selectors with Custom Pseudo-Classes

**CSS**:
```css
ToggleBtn:toggled {}
```

**CSS Selector**: 
```css
.Page__root .ToggleBtn__root[data-ToggleBtn-toggled]
```

#### Tag Selectors with Custom Pseudo-Elements

**CSS**:
```css
ToggleBtn::checkBox {}
```

**CSS Selector**: 
```css
.Page__root .ToggleBtn__root .ToggleBtn__checkBox
```

#### Class Selectors

**CSS**:
```css
.main-toggle {
    -st-extends: ToggleBtn;
}
```

**CSS Selector**: 
```css
.Page__root .Page__main-toggle.ToggleBtn__root
```

**JS value**: 
```js
Page["main-toggle"] === "Page__main-toggle"
```

#### Class Selectors with Custom Pseudo-Classes

**CSS**:
```css
.main-toggle:toggled {}
```

**CSS Selector**: 
```css
.Page__root .Page__main-toggle.ToggleBtn__root[data-ToggleBtn-toggled]
```

**JS value**: 
```js
/* custom pseudo-classees are not exported */
```

#### Class Selectors with Custom Pseudo-Elements

**CSS**:
```css
.main-toggle::highContrast {}
```

**CSS Selector**: 
```css
.Page__root .Page__main-toggle.ToggleBtn__root .ToggleBtn__highContrast
```

**JS value**: 
```js
/* custom pseudo-elements are not exported */
```

### Named Imports

Named imports result in slightly different output, and do not extend the root of the component as the default import of the component does. Let's take a look at the differences.

#### CSS:
```css
@namespace "Page";
:import {
    -st-from: './ToggleBtn.st.css';
    -st-named: highContrast, main-background-color;
}
```
#### Class Selectors

**CSS**:
```css
.myToggle {}
```

**CSS Selector**: 
```css
.Page__root .ToggleBtn__checkBox
```

**JS value**: 
```js
PageCSS["myToggle"] === "ToggleBtn__checkBox"
```

#### Class Selectors Extending a Named Internal Part

**CSS**:
```css
.myContrast {
    -st-extends: highContrast;
}
```

**CSS Selector**: 
```css
.Page__root .Page__myContrast.ToggleBtn__highContrast
```

**JS value**: 
```js
PageCSS["myContrast"] === "myContrast ToggleBtn__highContrast"
```

#### Class Selectors Using a Named Internal Part

**CSS**:
```css
.highContrast {}
```

**CSS Selector**: 
```css
.Page__root .Page__highContrast.ToggleBtn__highContrast
```

**JS value**: 
```js
PageCSS["highContrast"] === "hightContrast ToggleBtn__highContrast"
```

#### Vars Output

**CSS**:
```css
.someclass { /* To illustrate use of value(var) */
    border: 1px solid value(main-background-color)
}
```
