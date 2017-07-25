# Global selectors

Selectors inside the `:global()` directive selector are not scoped to the stylesheet. 

In this example `.classB` and `.classC` are not coped to `App`.

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

> **Note**: You can also use global pseudo-classes and elements to override an override. But why would you?! You can describe them using this syntax:
>
> ```css
> .classA :global(.classB > .classC) .classD:global(:hover) {
>     color: red;
> }
> ```

