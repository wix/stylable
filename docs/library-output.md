# Library Output 

Publishing a project as a component library result in code that can be used in various cases:
 * widget - directly use component JS with default styling (when multiple widgets are created, you might need commons) 
 * build naive - build with normal CSS loader to add default CSS
 * Stylable composition - use Stylable loader to compose component style

## Source

* component.tsx - `require('./component.st.css);`
* component.st.css

## Target

 * lib
    * component.js - `require('./component.st.css)`
    * component.st.css.js - generate CSS according to environment
    * component.st.source.css - source CSS
    * component.st.css - target CSS with default theme applied

```js
/* component.js */
const componentCSS = require('./component.st.css);
assert(componentCSS.root, 'namespaced_root');
assert(componentCSS.title, 'namespaced_title');
```

```js
/* component.st.css.js */
module.exports = {
    default: {
        root: 'namespaced_root',
        title: 'namespaced_title'
    }
}
```

```css
/* component.st.source.css */
.title{ color:red; }
```

```css
/* component.st.css */
.namespaced_title{ color:red; }
```

## Use as dependency


### Simple HTML dependency

Simple HTML template:

```html
<html>
    <head>
        <link href="component.st.target.css" rel="stylesheet"/>
        <script src="component.js"></script>
    </head>
    <body>
    <script>
        /* Component is available globally */
    <script>
    </body>
</html>
```

### Webpack without any loader

...pack js together - collect CSS manually...

### Webpack with style-loader

will prefer `component.st.css` target CSS and treat it like any other CSS... (talk about imports)

### Webpack with stylable-loader










Requiring `node_modules/NPM_ID/lib/component.js` requires `component.st.css.js` that:

1. when `document.head` is available
    1. load and append default target CSS to document head
    1. resolve default local-to-global stylesheet map (.my-class > .scoped-my-class)
1. when evaluate in node
    1. when no loader available (can we find out?)
        1. ??? 
    1. when stylable loader is available (can we find out?)
        1. generate run-time stylesheet from `component.st.source.css` (register stylesheet to Stylable)
    1. when [style-loader](https://github.com/webpack-contrib/style-loader) is available
        1. 


```js
if(document.head){
    var defaultCSS = fetch('component.st.target.css');
    document.head.append(<style>{defaultCSS}</style>);
}

```