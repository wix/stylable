import index from './index.st.css';
import { deep } from 'test-components';

const el1 = deep.button.render();

document.documentElement.classList.add(index.root);

document.body.appendChild(el1);
