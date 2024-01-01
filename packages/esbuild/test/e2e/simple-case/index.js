import { classes as classesA } from './a.st.css';
import { classes as classesB } from './b.st.css';
import { classes as classesInternalDir } from './internal-dir/internal-dir.st.css';
document.body.className = classesA.root + ' ' + classesB.root;
document.body.textContent = 'This color should be green';
document.body.appendChild(createDeepElementWithoutInputDeepCss());
document.body.appendChild(createTestElement());

function createDeepElementWithoutInputDeepCss() {
    const element = document.createElement('div');
    element.className = 'deep__root';
    element.textContent = 'This element should not have --unused-deep variable';
    return element;
}

function createTestElement() {
    const element = document.createElement('div');
    element.className = classesInternalDir.root;
    element.textContent = 'This element should have purple stylable logo background';
    return element;
}
