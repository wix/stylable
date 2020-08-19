---
id: references/keyframes
title: Keyframes
layout: docs
---

In CSS, [`@keyframes`](https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes) exhibit a behavior similar to classes where all names are global and can potentially clash in the DOM.

To avoid this issue, **Stylable** performs automatic namespacing of keyframes based on the stylesheet in which they were created.


### Example

```css 
@namespace "Comp";

@keyframes slide {
  from { transform: translateX(0%); }
  to { transform: translateX(100%); }
}

.root { 
    animation-name: slide; 
}
```

```css
/* CSS output */

@keyframes Comp__slide {
  from { transform: translateX(0%); }
  to { transform: translateX(100%); }
}

.Comp__root { 
    animation-name: Comp__slide;
}
```

## Imports and Exports

**Stylable** automatically exports all keyframes created within a stylesheet. **Stylable** will also re-export any imported keyframes.

To import any such symbol in a different stylesheet, **Stylable** uses a utility function, `keyframes([NAME1, NAME2, ...])` to specifically target keyframes imports.

### Example

```css
/* index.st.css */

:import {
    -st-from: "./animations.st.css";
    -st-named: keyframes(slideX, slideY);
}

.root { animation-name: slideX; }

.part { animation-name: slideY; }
```

```css
/* animations.st.css */

@keyframes slideX {
  from { transform: translateX(0%); }
  to { transform: translateX(100%); }
}

@keyframes slideY {
  from { transform: translateY(0%); }
  to { transform: translateY(100%); }
}
```

### Keyframes aliasing

To create a local alias of a keyframe, Stylable supports the same `[NAME] as [NEW_NAME]` syntax inside the keyframe import utility, as it does for any named import.

```css
:import {
    -st-from: "./animations.st.css";
    -st-named: keyframes(slide as mySlide),
               somePart as myPart;
}
```

Note that this keyframe will be re-exported under its new alias name, and not the original imported name.

## Runtime mapping

The **Stylable** runtime stylesheet exposes the `keyframes` key which contains a mapping of source keyframe names to their namespaced target name.
You can use these keyframes to apply animations via inline styling.

### Example

```css
@namespace "Comp";

@keyframes slide {
  from { transform: translateX(0%); }
  to { transform: translateX(100%); }
}
```

{% raw %}
```js
import { classes, keyframes } from './entry.st.css';

<div className={classes.root}
     style={{ animationName: keyframes.slide }} />
```
{% endraw %}


```html
/* DOM output */

<div className="Comp__root"
     style="animation-name: Comp__slide;" >
</div>
```

