import * as Label from 'component-library/basic/label';
import * as Button from 'component-library/basic/button';

const btn = Button.render('I am a button');
btn.id = 'btn';
document.body.appendChild(btn);

const label = Label.render('I am a label');
label.id = 'label';
document.body.appendChild(label);
