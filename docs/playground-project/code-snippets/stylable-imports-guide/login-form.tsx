import React = require('react');
import {Button} from './button'

export interface FormProps {
    className: string;
}

export class Form extends React.Component<FormProps, {}> {
    static defaultProps: FormProps = {className:''}

    render () {
        return (
            <div className="root">
                <input className="email"/>
                <input className="password"/>
                <Button className="OK">OK</Button>
                <Button className="cancel">Cancel</Button>
            </div>
        );
    }
};