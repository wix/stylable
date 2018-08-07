import style from './gallery.st.css';
import { label } from 'test-components/label';
const render = () => {
    const gl = document.createElement('div');
    const lbl1 = label.render('left');
    const lbl2 = label.render('right');
    gl.appendChild(lbl1);
    gl.appendChild(lbl2);
    gl.classList.add(style.root);
    lbl1.classList.add(style.lbl1);
    lbl2.classList.add(style.lbl2);
    return gl;
};
export { style, render };
