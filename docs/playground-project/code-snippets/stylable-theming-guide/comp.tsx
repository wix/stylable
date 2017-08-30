import React = require('react');
import {Button} from './button'

export interface CompProps {
    className: string;
}

export class Comp extends React.Component<CompProps, {}> {
    static defaultProps: CompProps = {className:''}

    render () {
        return (
            <div className="root">
                <Button className="submitButton">OK</Button>
                <Button className="cancelButton">Cancel</Button>
            </div>
        );
    }
};