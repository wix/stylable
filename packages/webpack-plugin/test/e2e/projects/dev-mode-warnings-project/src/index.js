import { classes } from './index.st.css';
import { classes as otherClasses } from './other.st.css';
import './not-direct.st.css';

const d = document.body.appendChild(document.createElement('div'));
d.textContent = 'Not Direct';
d.setAttribute('data-not-direct', 'true');
d.className = classes.notDirect + ' ' + otherClasses.root;
document.body.classList.add(classes.root);
