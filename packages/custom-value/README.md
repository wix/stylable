# @stylable/custom-value

[![npm version](https://img.shields.io/npm/v/@stylable/custom-value.svg)](https://www.npmjs.com/package/stylable/custom-value)

`@stylable/custom-value` serves as a package where various implementation for Stylable (build-time) variable custom types.
Currently, this package only offers an `stBorder` type, with more to be added in the future.

## Usage example

```css
:import {
  -st-from: '@stylable/custom-value';
  -st-named: stBorder;
}

:vars {
  myBorder: stBorder(1px, solid, green);
}

.root {
  border: value(stBorder); /* returns: 1px solid green */
  background-color: value(stBorder, color); /* returns: green */
}
```
