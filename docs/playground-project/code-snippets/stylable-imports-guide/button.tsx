import React = require('react');

export interface ButtonProps {
    className: string;
}

export class Button extends React.Component<ButtonProps, {}> {
    static defaultProps: ButtonProps = {className:''}

    render () {
        return (
            <button className="root">
                <div className="icon"/>
                <span className="label">Click Here!</span>
            </button>
        );
    }
};