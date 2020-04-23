---
id: guides/migration-v3
title: Migrating to Stylable v3
layout: docs
---

This guide is intended to help migrate stylable version 1 or 2 to stylable version 3.
It is mainly geared towards stylable integration within React.

# Suggested steps of migration

Follow these steps for a smooth transition. Each step is explained in
more detail below.

1. Update dependencies
1. Update `.st.css` file imports
1. Update usage in React components
1. Update tests

## Update dependencies

Ensure you have v3 stylable dependencies available. You may need to
update your `package.json` or ensure that other dependencies bring you
v3 stylable:

- `@stylable/cli`
- `@stylable/core`
- `@stylable/runtime`
- `@stylable/node`
- `@stylable/webpack-plugin`


> Note: all stylable packages in v3 are scoped under `@stylable` namespace. 
> if you have dependency like `stylable` (without namespace),
> it is a different one and should be changed to namespaced version.

## Update `.st.css` file imports

Prior to v3 all `.st.css` files would export `style` function. In v3
this has changed: `.st.css` files now export an object.

List of all exported keys:

```
import {
  classes,
  cssStates,
  keyframes,
  namespace,
  st,
  stVars,
  style,
  vars,
} from './style.st.css';
```

This means that all imports of `.st.css` files have to be changed, for example:

```diff
-import style from './Component.st.css';
+import { style, classes, /* ... */ } from './Component.st.css';
```

However, most often `{ style, classes }` is enough:

`import { style, classes } from './Component.st.css';`

## Update usage in React components

Once `.st.css` imports are updated, React components should be updated too:

```diff
-<div {...style('root', states, props)} /> />
+<div className={style(classes.root, states, props.className)} />
```

There is a subtle but very important nuance in this change.

Stylable v1 and v2 used spread pattern. It would take the output of
`style('root', states, this.props)` function and spread it on component.

This way one or more props would be applied to the component. Thus, code that looks like this:

```
<div {...style('root', {}, { className: 'additional-class', dataHook: 'test', hello: 'world' })} />
```

once evaluated, would behave like this:

```
<div
  className="root additional-class"
  dataHook="test"
  hello="world"
/>
```

Stylable v3 usage is like so:

```
className={style(classes.root, states, this.props.className)}
```

There is no more props sprad anymore and stylable requires only
`className` to be used.

However, if you were relying on the props spread pattern, in v3 you
might find some props missing.

Therefore, with Stylable v3 it is up to you to apply any additional props:

```
<div className={style(classes.root, states, 'additional-class')} dataHook="test" hello="world" />
```

> Note: find more details and examples in React integration guide https://stylable.io/docs/getting-started/react-integration

## Update tests

If you were using `@stylable/dom-test-kit`, it's usage has slightly
changd in v3:

```diff
import { StylableDOMUtil } from '@stylable/dom-test-kit';
-import * as style from './Component.st.css';
+import * as style from './Component.st.css';
const stylableDOMUtil = new StylableDOMUtil(style);
```

Just as before, `StyalbleDOMUtil` accepts an argument, which is all that
`.st.css` file exports

Prior to v3 it was only one thing - `style` function

In v3 `.st.css` files export more than that, therefore an easy way to
fix tests is to use `* as`:

`import * as style from './Component.st.css';`
