import { classes as classesA } from './a.st.css';
import { classes as classesB } from './b.st.css';
document.body.className = classesA.root + ' ' + classesB.root;
document.body.textContent = 'This color should be green';
