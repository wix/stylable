import React = require('react');
import {Button} from './button'

export interface AppProps {
    className: string;
}

export class App extends React.Component<AppProps, {}> {
    static defaultProps: AppProps = {className:''}

    render () {
        return (
            <div className="root">
                <input className="emailInput"/>
                <input className="passwordInput"/>
                <Button className="submitButton">OK</Button>
                <Button className="cancelButton">Cancel</Button>
            </div>
        );
    }
};
