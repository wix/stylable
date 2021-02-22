---
id: references/namespace
title: Namespace
layout: docs
---
## Manual Namespace

When you develop your application in **Stylable**, you can manually namespace classes so you can more easily identify them when they are displayed in the CSS output. You do this in your **Stylable** stylesheet by adding the syntax `@namespace` to provide better display names to your classes.

```css
@namespace "my-gallery";
.root { color: red; }
``` 

```css
/* CSS output */
.my-gallery__root { color: red; }
```

> **Note**    
> Because `@namespace` is not unique, the scoped name may still have a suffix added to it to make it unique.
