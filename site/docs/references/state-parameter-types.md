---
id: references/state-parameter-types
title: Pseudo-Classes parameter types
layout: docs
---

When defining a custom state that accepts a parameter, you need to provide a type validator. 

A custom state with no parameters is considered as a [simple custom state](./pseudo-classes.md#simple-custom-states).

All custom states with a parameter must define the parameter type. It is also possible to provide each state definition with a `default value`, allowing it to be used without providing a parameter argument:
```css
.root {
    -st-states: stateX([type]) [default Value?], 
                stateY([type]) [default Value?];
}

.root:stateX(arg) {}

.root:stateX {
    /* argument will resolve to "default Value" if provided */
}
```

> **Note** 
> You can use [variables](./variables.md) and [formatters](./formatters.md) when defining a `default value`.

## Tag

Allows defining a custom state with a **tags value** (seperated by whitespace). and then targeting it using a pseudo-class selector with a matching **tag argument**:

```css
.root {
    /* define the cart custom state */
    -st-states: cart( tag )
}

.root:cart(shirt) {
    /* targets an element with a state value that
    is a whitespace-separated list of words, 
    one of which is exactly the tag argument "shirt" */
}
```

Setting the state **tags value** in the view `<span {...style("root", {cart: "shirt pants"})}>` will resolve to `<span data-cart="shirt pants" />`.

## Enum

Allows defining a custom state with possible **enum value** options. and then targeting one of the options using a pseudo-class selector with a matching **string argument**:

```css
.root {
    /* define the size custom state */
    -st-states: size( enum(small, medium, large) )
}

.root:size(medium) {
    /* target an element with a "medium" state value */
}

.root:size(huge) {
   /* invalid due to "huge" not being a valid option */
}
```

Setting the state **enum value** in the view `<span {...style("root", {size: "medium"})}>` will resolve to `<span data-size="medium" />`.

## String

Allows defining a custom state with a **string value**. and then targeting it using a pseudo-class selector with a matching **string argument**:

```css
.root {
    /* define the selected custom state 
    with a string parameter type */
    -st-states: selected( string );
}

.root:selected(username) {
    /* target an element with a state value that 
    is exactly the string argument "username" */
}
```

Setting the state **string value** in the view `<span {...style("root", {selected: "username"})}>` will resolve to `<span data-selected="username" />`.

### Validation [optional]

You can pass an optional regex string (must be wrapped in quotes) as an argument in order to add validation for the pseudo-class selector **string argument**:

```css
.root {
    /* validates the targeting string 
    argument begins with "user" */
    -st-states: selected( string("^user") );
}

/* a valid argument */
.root:selected(username) {}

/* invalid due to regex mismatch */
.root:selected(index) {}
```

String type can also accept several other validations, including `minLength(number)`, `maxLength(number)` and `contains(string)`:

```css
.root {
    /* validates the targeting string 
    arguments with multiple validations */
    -st-states: selected( 
                    string( 
                        minLength(2), 
                        maxLength(10), 
                        contains(user) 
                    ) 
                );
}

/* a valid argument */
.root:selected(username) {}

/* invalid due to minLength(2) & contains(user) */
.root:selected(x) {}
```

## Number

Allows defining a custom state with a **number value**. and then targeting it using a pseudo-class selector with a matching **number argument**:

```html
<span data-column="5" />
```

```css
.root {
    /* define the column custom state */
    -st-states: column( number )
}

.root:column(5) {
    /* target an element with a state value that 
    is exactly the number argument "5" */
}
```

Setting the state **number value** in the view `<span {...style("root", {column: 5})}>` will resolve to `<span data-column="5" />`.

### Validation [optional]

You can use several sub validators that the number type provides:

```css
.root {
    /* validates the targeting number argument */
    -st-states: column( number( min(2), max(6), multipleOf(2) ) )
}

/* valid arguments */
.root:column(2),
.root:column(4),
.root:column(6) {}

/* invalid due to "multipleOf(2)" */
.root:column(3),
.root:column(5) {}

/* invalid due to "min(2)" and "max(6)" */
.root:column(1),
.root:column(7) {}
```

## Future Intent

* [Custom user types and validations](https://github.com/wix/stylable/issues/268).
* [Custom pseudo state type "nth"](https://github.com/wix/stylable/issues/270).
* [Multiple named parameters](https://github.com/wix/stylable/issues/269).
* [Custom pseudo state string prefixes](https://github.com/wix/stylable/issues/271).
* Lang type - take advantage of attribute selector `[state|="en"]` to support language code.