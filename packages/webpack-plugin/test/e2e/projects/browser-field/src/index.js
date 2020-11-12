import { classes } from './app.st.css';
import { Button } from 'test-components';

const btn = Button.render();
btn.id = 'btn';
btn.classList.add(classes.root)

document.body.appendChild(btn);
