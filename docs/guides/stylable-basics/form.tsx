import * as React from 'react';
import {SBComponent} from 'stylable-react-component';
import Button from './button';
import style from './form.st.css';

export interface FormProps {
    className: string;
}

class Form extends React.Component<FormProps, {}> {
    static defaultProps: FormProps = {className: ''};
    
    render() {
        return (
            <div>
                <input className="email" />
                <input className="password" />
                <Button className="button" />
            </div>
        );
    }
}

export default SBComponent(Form, style);
