import * as React from 'react';
import {SBComponent} from 'stylable-react-component';
import style from './button.st.css';

export interface ButtonProps {
    className: string;
}

class Button extends React.Component<ButtonProps, {clicked: boolean}> {
    static defaultProps: ButtonProps = {className: ''};
    
    constructor(props: any) {
        super(props);
        this.state = {clicked: false};
    }

    render() {
        return (
            <button cssStates={{clicked: this.state.clicked}} onClick={() => this.setState({clicked: !this.state.clicked})}>
                <div className="status"/>
                <span className="label">Status</span>
            </button>
        );
    }
}

export default SBComponent(Button, style);

