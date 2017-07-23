# DELETED FILES - Deprecated or Reduntant Content

## OVERVIEW - all content has been moved over to Home Page and other files

CSS for the component world
Stylable is an open-source pre-processsor that converts our own Stylable syntax into static, valid CSS. Because we 💖 CSS we want to use CSS as our syntax in every way possible. We want what we do to be in-line with agreed-to specs.

Therefore, Stylable is expressed in a syntax that extends native CSS by adding a small amount of optional directive rules allowing you to generate static valid CSS from composable stylesheets match custom elements and states (like native components)

This means you can treat user-defined components as native HTML elements, and optionally allows styles to be scoped so that there is no danger of clashing names or styles “leaking”.

Stylable creates CSS that fits the component ecosystem by enabling Components to expose a reusable interface, use namespacing, and to know what can be customized.

Stylable produces readable class names for ease of debugging, Because it is a pre-processor, you’ll have more performant web applications and no run-time errors. At Wix, we use it in production with a React stack, but it is framework-agnostic.

[Why ‘Styable’ not ‘Styleable’? https://www.w3.org/TR/SVG11/concepts.html#Stylable]

How does Stylable perform this Voodoo?

Stylable allows you to declare a specific scope as a root and allowis each root to describe its interface, thus doing two important things:

enabling inspection of children components for styling any level inwards, and
exposing an API scheme to any component wishing to implement the current component.
Once a root is declared, simple CSS selectors (class and element selectors) are used to style the component, as well as declare an external API.

Custom pseudo-classes, pseudo-elements and mix-ins

CSS pseudo-classes are extended to allow custom states like “loading” or “shit-faced” to be described.

CSS pseudo-elements are extended to enable styling the internal parts of child components at any depth, allowing custom pseudo elements to be described (the first character of the label of the button in the form that my app uses for social login).

And mixins allow you to have component variants, simple and complex layouters, and other nifty tricks!

[BL: we need to define 'layouters'.

Stylable’s CSS extensions

Element Selectors can target Components

To play well with component-based systems, Stylable treats developer-defined components as first-class citizens, as if they were HTML tags. Therefore, to style each instance of component MyComponent, we just write

MyComponent {color:red;}
By convention, user-defined components begin with a capital letter, but this is not enforced by Stylable.

(Strictly speaking, this isn’t an extending CSS at all; CSS is a mark-up independent language that can be used with XML, SVG etc as well as HTML.)

Class Selectors can define scope with a :root declaration

Stylable provides the ability to declare a "root" at every level of the component / application.

This root scopes everything below it, and exposes an interface to anything above it (that is, anything that's implementing it). This allows you to

target an internal node of a component inside a component inside a component... etc, and
target every node in the defined scope.
It also allows us to define an external API by which anyone using the component will be able to access its internals and state.

Custom pseudo-elements for styling inside Components

Stylable extends the CSS pseudo-element mechanism to allow you to “pierce” the boundary between your code and encapsulated Components.

For example, assume that on your page you have a login form, containing a Component that deals with Social Login - a list of buttons to click to login with Facebook, Google+, Twitter etc.

[diagram of component structure]

To change the background colour of the SocialLogin component, you need to pierce the boundary between your page and the Component:

.loginForm::SocialLogin {background-color:green}
A custom pseudo-element can only pierce into the top level of the Component. If you wish to pierce deeper, you can chain pseudo-elements.

For example, suppose that you wanted a red border around each social media login button. Inside the SocialLogin component, are multiple instances of SocialButton component, each containing a clickable logo of an individual social media login provider.

[diagram of sub-component structure]

To style these:

.loginForm::SocialLogin::SocialButton
  {border: 1px solid red;}
(Currently, CSS doesn’t allow multiple pseudo-elements on the same selector due to implementation complexity. Have no fear! Stylable transpiles all rules into a flat DOM, so the chained pseudo-elements won't be seen by browsers.

Styleable doesn't suffer the same implementation complexities as browsers do; therefore we’re confident that this extension adheres to the spirit of the CSS spec.

[how do we define these components and subcomponents, so that our custom pseudo-elements can pierce them and apply styles?]

We use our ability to set a root at any level, and define type interfaces. [Link to Readme on root()]

Custom pseudo-classes for state

Along with CSS’s built-in pseudo-classes (such as :hover, :disabled, :empty, :nth-child() etc), Stylable allows you to define custom pseudo-classes so you can easily apply stylistic changes based on state.

For example, you might define a :loading custom pseudo-class in order to style div:loading with a pulsing border.

Note: It’s important for accessibility reasons that important information isn’t conveyed only through visual styles, however. For example, it’s common to style a:visited to visually distinguish visited links. A screenreader will automatically read “visited” before the contents of the <a> element, because a visually-impaired user won’t see the default blue underline, or the results of your CSS.

It’s also possible to redefine a native pseudo-class; you could, for example, redefine :hover so that it is set when an <img> is displaying a picture of a hovercraft. But that would be wrong and evil, and send your team-mates mad, so please don’t.

## VALUE PROPOSITION

Introducing Stylable: CSS in a Components World

At Wix, we love CSS. It's a simple, declarative syntax that's native in browsers which have twenty years experience optimising the rules and layout, so it's easily the fastest way to add styles to web pages and web apps.

But writing and maintanining CSS across large teams and large projects can be tricky. Writing CSS that is scoped to individual components is hard - developers are obliged to maintain highly-specific selectors, using elaborate conventions in order to fake namespacing.

We wanted to extend CSS so that it is easier to use in a Components world, but without losing the aspects of CSS that make it great: declarative, familiar, static and fast. So we made Stylable.

Styable is a preprocessor that allows you to write style rules in CSS syntax, with some extensions (which we believe adhere to the spirit of CSS and some nascent specifications) that allow

scoping styles to components so they don't "leak" and clash with other styles
crossing component boundaries to over-ride its own style (so, for example, you can import a login component and set its background color from outside the component, leading to greater reusability)
use of mixins and variants [tell a component to use a Wix theme or a Bootstrap theme]
At build time, the preprocessor converts the Stylable CSS into flat, static, valid vanilla CSS that works cross-browser.

[We want to be the Typescript of CSS. Add more shit about about Typed CSS (reasons: completion, validation, vary interfaces w/o making mistakes.) ]

As Håkon Wium Lie, co-creator of CSS told me,

New ideas will come along, but they will extend CSS rather than replace it. I believe that the CSS code we write today will be readable by computers 500 years from now.
And we agree. Viva CSS, and welcome Stylable. We hope you like it.

Like SASS or LESS we pre-process. But we make component-friendly CSS. Yes!

## FEATURES

Stylable is an open-source preprocessor that optimizes CSS for the component ecosystem.

Use Bruce's overview

Our library can discover and style child components, customize classes and elements, and expose its API for use externally.

During buildtime it converts into static, valid CSS, reducing runtime errors and increasing performance. This library:

Super set of all/valid Any CSS is valid scope the CSS, interface Lets you separate the styling of the component Easily separate the different styles (variants of the component) so they can be accessed and used separately Internal parts - allow customizations of internal parts of components Allow components to define custom states.

Stylesheets for a component world - built-in easy to manage namespacing, encapsulation with validation

Enables declaring any level component as a root, allowing each root to describe its interface.
Discovers child components at any level from the root.
introduce a type system to CSS
Allows styling discovered components using CSS selectors like class and tag.
Exposes an API so any component can implement the current component.
Extends CSS pseudo-classes to allow custom states to be described and used, such as "loading" or "shit-faced".
Extends CSS pseudo-elements to override the styling set in the internal parts of child components at any depth, allowing custom pseudo-elements to be described.
Adds mixins allowing you to use component variants and create your own, use and develop simple and complex sets of instructions for creating layouts and themes, and other cool stuff!

## REFERENCE  

Syntax and Terminology Reference

Term	Definiton	Link to Code Example
-sb-from	gets the path to the module that's being imported	Code
-sb-default	defines a default export class, as well as namespaces it / names the default import
-sb-named	defines and namespaces other exports from the same module
CLASSES		
-sb-root	one per component, declares the class that is describing the root level of the component. default is false of course
}"		
-sb-from	gets the path to the module that's being imported }" -sb-default	defines a default export class, as well as namespaces it / names the default import -sb-named	defines and namespaces other exports from the same module NS Classes -sb-root	one per component, declares the class that is describing the root level of the component. default is false of course	"set root:

.rootClass { -sb-root: true; color: blue; }" -sb-type	type of the component - has to be declared elsewhere above, or imported from an external source	"declare root as an exportable type:

.galleryRoot { -sb-root: true; -sb-type: Gallery; color: blue; }

implement an imported or existing type on a class:

.galleryButton { -sb-type: Button; color: white; }" -sb-states	list of states that are available on our component (hover, loading, empty)	"expose a state on the root node:

.galleryRoot { -sb-root: true; -sb-states: loading, error; color: blue; }

implement the state:

.myGallery:loading { -sb-type: gallery; color: black; }" -sb-mixins	list of mixins we want to apply to our class	".submitButton { -sb-type: Button; -sb-mixin: grid(5,3); background-color: white; }

will apply a grid layout with the parameters 5 and 3 (probably cols and rows)" -sb-preset	marks a class as a "preset". a mixin without parameters. it's a boolean.	"in Button we declare

.Button_large { -sb-preset: true; font-size: larger; }

then in a button instance

.myButton { -sb-type: Button; -sb-mixin: grid(5,3), Button_large; background-color: white; }"

## README

Styable is a preprocessor that allows you to write style rules for components in CSS syntax, with some native extensions. It scopes styles to components, provides a style API for greater reusability, and uses mixins and variants. At build time Stylable converts into flat, static, valid, vanilla CSS that works cross-browser.

Documentation

Getting Started

Prerequisites

Installation

2 scenarios Install for use with an existing project and create components with Stylable

Install to create a project

Export the project - to a 3rd party OR as an end project

clone:

git clone git@github.com:wixplosives/nscss-examples.git

go to directory:

cd nscss-examples

yarn install v0.23.4

start project:

npm start

open URL:

http://localhost:8080/index.html

In your project, install Stylable:

npm install Stylable --save
Then import into any of your component

Admin Stuff

Change Log

How to Open Issues

How to Contribute
