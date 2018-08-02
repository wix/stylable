---
id: references/state-parameter-types
title: Parameter Types to Use with Pseudo-Classes 
layout: docs
---

Custom [pseudo-classes](./pseudo-classes.md) can either be simple or accept parameters. 

A custom pseudo-class with no parameters is considered a [simple custom state](./pseudo-classes.md#simple-custom-states).

When defining a custom pseudo-class with a parameter:

* You must provide a type definition.
* Optionally you can provide validation arguments to the type defined
* Optionally you can provide each state definition with a `default value`, enabling it to be used without providing a parameter argument.

```css
.root {
    -st-states: stateX([type]) [default Value?],
                stateY([type]) [default Value?];
}

.root:stateX(arg) {}

.root:stateX {
    /* parameter resolves to "default Value", 
    if no default value was provided,
    this will fail validation */
}
```

> **Note**   
> When defining a `default value`, you can use [variables](./variables.md) and [formatters](./formatters.md).

## Tag

You can define a custom state with a **tags value** (seperated by whitespace), and then target it using a pseudo-class selector with a matching **tag argument**.

```css
.root {
    /* define a custom state called "cart" */
    -st-states: cart( tag )
}

.root:cart(shirt) {
    /* targets an element that has a state with a value that
    is a whitespace-separated list of tags, 
    one of which is exactly the tag argument "shirt" */
}
```

Setting the state **tag values** in the view `<span {...style("root", {cart: "shirt pants"})}>` resolves to `<span data-cart="shirt pants" />`.


## Enum

You can define a custom state with possible **enum value** options, and then target one of the options using a pseudo-class selector with a matching **string argument**.

```css
.root {
    /* define the custom state "size" */
    -st-states: size( enum(small, medium, large) )
}

.root:size(medium) {
    /* target an element with a state value of "medium" */
}

.root:size(huge) {
   /* invalid because "huge" is not a one of the possible 
   values defined for the state "size" */
}
```

Setting the state's **enum value** in the view `<span {...style("root", {size: "medium"})}>` resolves to `<span data-size="medium" />`.

## String

You can define a custom state with a **string value**, and then target it using a pseudo-class selector with a matching **string argument**.

```css
.root {
    /* define the "selected" custom state with a string parameter type */
    -st-states: selected( string );
}

.root:selected(username) {
    /* target an element with a state value that 
    is exactly the string argument "username" */
}
```

Setting the state **string value** in the view `<span {...style("root", {selected: "username"})}>` resolves to `<span data-selected="username" />`.

### String validation [optional]

You can optionally pass a regular expression string as an argument to add validation for the pseudo-class selector **string argument**. The regular expression must be within quotes.

You can optionally pass a regular expression function (`regex()`) to the string type to add regular expression validation for the pseudo-class selector. 
This function accepts a single expression to be tested against the selector parameter. The expression must be within quotes.


```css
.root {
    /* validates that the targeting string argument begins with "user" */
    -st-states: selected( string(regex("^user")) );
}

/* a valid argument */
.root:selected(username) {}

/* invalid because it doesn't match the regular expression "^user" */
.root:selected(index) {}
```

String type can also accept several other validations, including `minLength(number)`, `maxLength(number)` and `contains(string)`.

```css
.root {
    /* validates the targeting string arguments with multiple validations */
    -st-states: selected( 
                    string( 
                        minLength(2), 
                        maxLength(10), 
                        contains(user) 
                    ) 
                );
}

/* valid argument */
.root:selected(username) {}

/* invalid due to minLength(2) & contains(user) */
.root:selected(x) {}
```

## Number

You can define a custom state with a **number value**, and then target it using a pseudo-class selector with a matching **number argument**.

```html
<span data-column="5" />
```

```css
.root {
    /* define the custom pseudo-class "column" */
    -st-states: column( number )
}

.root:column(5) {
    /* target an element with a state value that is exactly the number argument "5" */
}
```

Setting the state **number value** in the view `<span {...style("root", {column: 5})}>` resolves to `<span data-column="5" />`.

### Number validation [optional]

You can use several validators that the number type provides.

```css
.root {
    /* validates the targeting number argument */
    -st-states: column( number( min(2), max(6), multipleOf(2) ) )
}

/* valid arguments */
.root:column(2),
.root:column(4),
.root:column(6) {}

/* invalid because not a "multipleOf(2)" */
.root:column(3),
.root:column(5) {}

/* invalid because of "min(2)" and "max(6)" validations */
.root:column(1),
.root:column(7) {}
```

## Future intent

* [Custom user types and validations](https://github.com/wix/stylable/issues/268)
* [Custom pseudo-class type "nth"](https://github.com/wix/stylable/issues/270)
* [Multiple named parameters](https://github.com/wix/stylable/issues/269)
* [Custom pseudo-class string prefixes](https://github.com/wix/stylable/issues/271)
* Lang type - use attribute selector `[state|="en"]` to support language code