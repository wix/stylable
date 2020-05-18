import { hello } from './foo.st.css';
import { bar } from './bar.st.css';
import "./index.st.css";
console.log(hello, bar);

// Promise.all([import(/* webpackChunkName: "bar" */'./bar.st.css'), import(/* webpackChunkName: "foo" */'./foo.st.css')]).then(([m1, m]) => {
//     console.log('lala!', m.classes);

//     document.body.innerHTML = `
//     <div class="${m.classes.hello}">Hello</div>
//     <div class="${m1.classes.bar}">Bar</div>
//     `;
// });
