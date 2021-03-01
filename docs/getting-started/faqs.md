# FAQs

0. What were the inspirations for developing **Stylable**?

    - [BEM](http://getbem.com/)
    - [Typescript](http://www.typescriptlang.org/)

1. What’s **Stylable** based on?

    - [PostCSS](http://postcss.org/)

2. What can I use **Stylable** with?

    - Anything - but at the moment we have [integrations](./react-integration.md) with React and Webpack, with more to come. Here's an example of [Vue.js and Stylable](https://github.com/wix-playground/stylable-vue-example) working together.

3. Who uses **Stylable**?

    - We’re currently integrating **Stylable** into the Wix back-office systems so we can battle-test it and learn where the holes are. Then we’ll use it to power the 100+ million websites created and hosted on the Wix platform.

4. **Stylable** produces a static CSS file, great. But there's a piece that updates style states in runtime, right? How does that affect **Stylable** in terms of size?

     - Minimally. **Stylable** runtime has 2 parts: 
        1 - Runtime mapping maps the local to global of whatever you define in the stylesheet (`.myClass` = `.NS__myClass`).
        2 - The import value that you get when importing an `st.css` file and optional integration code. 
        
    Our integration is what turns `className={style.local-string}` into the correct global class name. It also offers the ability to add states and copy `data-*` and `className` attributes to root.

