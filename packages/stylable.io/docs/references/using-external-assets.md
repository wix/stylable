---
id: references/using-external-assets
title: Using External Assets
layout: docs
---

Stylable supports usage of [url functions](<https://developer.mozilla.org/en-US/docs/Web/CSS/url()>) to use assets as you normally would in CSS.

The value passed to the `url()` function is resolved differently in CSS as comapred to the Node request resolution algorithm, used for Stylable stylesheet and symbol resolutions.

The `url()` function has no notion of external packages or dependencies.

### Resolving 3rd-party assets

In order to import `url()` assets from dependencies inside your `node_modules` directory, Stylable supports the `~` URL prefix.

```css
.root {
  /* resolves as the node request: "my-package/asset.png" */
  background: url(~my-package/asset.png);
}

.root {
  /* resolves as the node request: "./my-package/asset.png" */
  background: url(my-package/asset.png);
}
```
