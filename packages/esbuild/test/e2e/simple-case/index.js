import { classes as classesA } from './a.st.css';
import { classes as classesB } from './b.st.css';
document.body.className = classesA.root + ' ' + classesB.root;
document.body.textContent = 'This color should be green';
document.body.appendChild(createDeepElementWithoutInputDeepCss());

function createDeepElementWithoutInputDeepCss() {
    const element = document.createElement('div');
    element.className = 'deep__root';
    element.textContent = 'This element should not have --unused-deep variable';
    return element;
}
