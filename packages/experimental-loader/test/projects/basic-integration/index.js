import { classes } from './foo.st.css';
import './index.st.css';

document.body.innerHTML = `
    <div class="${classes.hello}">Hello</div>
    <div class="${classes.world}">World</div>
`;
