import React = require('react');

export interface ButtonProps {
    className: string;
}

export class Button extends React.Component<ButtonProps, {clicked:boolean}> {
    static defaultProps: ButtonProps = {className:''}
    
    constructor(props:any) {
        super(props);
        this.state = {clicked:false};
    }

    render () {
        return (
            <button className="myBtn" cssStates={this.state.clicked} onClick={()=>this.setState({clicked:true})}>
                <div className="btnIcon"/>
                <span className="btnLabel">Click Here!</span>
            </button>
        );
    }
};
