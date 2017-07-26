# Global selectors

In **Stylable**, selectors are scoped to the stylesheet. But what if you want to target global or other selectors that are not scoped? You can use the `:global()` directive selector. 

In this example `.classB` and `.classC` are not scoped to `App` but they are still colored red in the CSS.

CSS input
```css
    @namespace "App";
    .classA :global(.classB > .classC) .classD:hover {
        color: red;
    }

```

CSS output
```css
    .App_root .App_classA .classB > .classC .App_classD:hover {
        color: red;
    }
```

> **Note**: While we don't recommend it, you can also use global pseudo-classes and elements to override an override. You can describe them using this syntax:
>
> ```css
> .classA :global(.classB > .classC) .classD:global(:hover) {
>     color: red;
> }
> ```

