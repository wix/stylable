# Namespace

When you develope your application, you might want to hint **stylable** with better readable name to help scope your stylesheet.

Use `@namespace` to provide better display name:

CSS API
```css
@namespace "my-gallery";
.root { color: red; }
``` 

CSS OUTPUT
```css
.my-gallery__root { color: red }
```

> Note: namespace is not unique and scope name may still have suffix to make it unique