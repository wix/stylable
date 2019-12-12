import { classes } from './index.st.css';

document.documentElement.classList.add(classes.root);
const part = document.createElement('div');
part.className = classes.part;
part.textContent = 'This is a part';
document.body.append(part);
window.partBackground = getComputedStyle(part).backgroundColor;
