# Namespace

When you use **Stylable** your classes are automatically namespaced to that stylesheet. Each stylesheet has a single [root](./root.md).

## Manual Namespace

When you develop your application, you might want to hint **Stylable** with better readable name to help scope your stylesheet.

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

> Note: `@namespace` is not unique and scope name may still have suffix to make it unique
