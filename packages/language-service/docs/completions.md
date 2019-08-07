# Completions

The provider provides completion suggestions when a user types a trigger character or manually triggers a completion request.

Trigger charactes are:  "." ":" "-" and " "

In the current examples '|' denotes the user's starting caret position. $1, $2, etc. denote tabstops inside the completion, with $0 being the final cursor position after completion.

## Available Completions

### Top Level Directives

Top level directives are allowed only in the top level of the document.

- :import - imports dependencies
```css
    :import{
        -st-from:"$1"
    }$0
```
- :vars - define vars for use
```css
    :vars{
        $1
    }$0
```



### Class Definition Directives

Class definition directives are used to add metadata to a CSS class. They are only allowed inside simple selectors*.

Multiple use of the same directive in the same class is not allowed.

- -st-extends - defines class or variant to extend

```css
    .gaga{
        -st-extends:$1
    }$0
```

- -st-states - defines list of states available for css class
```css
    .gaga{
        -st-states:$1;
    }$0
```

### Import Rule Directives
Import rules are allowed only in import directive. '-st-from' is required, as is at least one of ['-st'default','-st-named'].

- -st-from:"" -  file path to import
```css
    :import{
        -st-from: "$1";
    }$0
```
- -st-default: - local name of default export
```css
    :import{
        -st-default: $1;
    }$0
```
- -st-named: - list of imported named imports

```css
    :import{
        -st-named: $1;
    }$0
```


### Mixin Directives
The mixin directive is allowed inside any selector except the top level directives

- -st-mixin - list of mixins to be applied

```css
    .gaga:hover button{
        -st-mixin: $1;
    }$0
```

### Selector Completions

#### Class

The names of existing classes should be offered as completions.

A "root" class is always available. The "root" class can only be used at the start of a selector.

##### Examples

predefined class
```css
    .gaga:hover{

    }
    .gaga$0
```

root class is always available
```css
    .root$0
```

completing a class as an extra to a complex selector
```css
    .gaga{

    }
    .root:hover .gaga$0
```

#### Tag

The names of imported components should be offered as completions

##### example

completion in root level
```css
    :import{
        -st-from:"./myfile.css";
        -st-default:Comp;
    }

    Comp$0
```

completion as part of complex selector
```css
    :import{
        -st-from:"./myfile.css";
        -st-default:Comp;
    }

    .root:hover Comp$0
```

#### Pseudo-States

Custom states need to be completed for relevant class

##### Examples

simple
```css
    .root{
        -st-states:hello;
    }

    .root:hello$0
```

in complex selctor
```css
    .gaga{
        -st-states:hello;
    }

    .root:hover .gaga:hello$0
```


class extended from import
```css
    :import{
        -st-from:"./myfile.css";
        -st-default:Comp;
    }

    .gaga{
        -st-extends:Comp;
    }

    .gaga:hello$0
```


#### Pseudo-Elements

Custom pseudo elements need to be completed for relevant classes

##### Examples

class extended from import
```css
    :import{
        -st-from:"./myfile.css";
        -st-default:Comp;
    }

    .gaga{
        -st-extends:Comp;
    }

    .gaga::inner-part$0
```

in complex selctor
```css
    :import{
        -st-from:"./myfile.css";
        -st-default:Comp;
    }

    .gaga{
        -st-extends:Comp;
    }

    .root:hover .gaga::inner-part$0
```


### Rule Value Completions

- value(varName): allowed in any non directive rule
```css
    .gaga{
        background:value($1);
    }
```

- -st-from value: allowed as value of -st-from. completes from fs
```css
    :import{
        -st-from:"./...$"
    }
```

- -st-named value: completes from file exports
```css
    :import{
        -st-from:"./my-other.css";
        -st-named: import1Name import2Name$1;
    }
```
- -st-extends value: completes from imported stylesheets and variants
```css
    :import{
        -st-from:"./my-other.css";
        -st-named: button-blue-variant;
    }
    .gaga{
        -st-extends: button-blue-variant$1
    }
```
```css
    :import{
        -st-from:"./my-other.css";
        -st-default: Comp;
    }
    .gaga{
        -st-extends: Comp$1
    }
```
- -st-mixin value: completes from imported variants and mixins
```css
    :import{
        -st-from:"./my-other.css";
        -st-named: button-blue-variant;
    }
    .gaga{
        -st-mixin: button-blue-variant$1
    }
```
```css
    :import{
        -st-from:"./my-mixin";
        -st-default: Mixin;
    }
    .gaga{
        -st-mixin: Comp$1
    }
```
### variable completion

completes available variables (from local file and imports) inside value()

## glosary

#### simple selectors
selectors in the top level of the document (not in media query) made up of one class selector:

```css
.className{

}
```


# completion matching


the files and postions:
```css

    :|
```
```css
    .gaga{
        color:red;
    }
    |
    .root{
        color:blue
    }
```

```css
    .gaga{
        color:red;
    }
    :|
    .root{
        color:blue
    }
```

will offer completions:

```css
    :import{
        -st-from:"$1"
    }
```
 and

```css
    :vars{
        $1
    }
```
