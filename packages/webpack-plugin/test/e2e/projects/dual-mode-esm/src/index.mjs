import * as Label from 'comps/basic/label';
import * as Button from 'comps/basic/button';

const btn = Button.render('I am a button');
btn.id = 'btn';
document.body.appendChild(btn);

const label = Label.render('I am a label');
label.id = 'label';
document.body.appendChild(label);
