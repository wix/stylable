import index from './index2.st.css';

const div = document.createElement('div');
div.dataset.name = 'index2'
div.classList.add(index.root);

div.textContent = JSON.stringify(
    window.stylable.$.getStyles([index.$id]).map(x => x.__proto__),
    null,
    4
);

document.body.appendChild(div);
