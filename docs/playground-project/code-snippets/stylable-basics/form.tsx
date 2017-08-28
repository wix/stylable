import React = require('react');
import {Button} from './button';

export interface FormProps {
    className: string;
}

export class Form extends React.Component<FormProps, {}> {
    static defaultProps: FormProps = {className:''}
    
    render () {
        return (
            <div className="myForm">
                <input className="formEmail" />
                <input className="formPassword" />
                <Button className="formBtn" />
            </div>
        );
    }
};