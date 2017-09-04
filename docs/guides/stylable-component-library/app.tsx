import * as React from 'react';
import {SBComponent} from 'stylable-react-component';
import style from './App.st.css';
import {MessageBox} from './message-box';
import {Button} from './button'

export interface AppProps {
    className: string;
}

class App extends React.Component<AppProps, {clicked: boolean}> {
    static defaultProps: AppProps = {className: ''};
    
    constructor(props: any) {
        super(props);
        this.state = {clicked: false};
    }

    render() {
        return (
            <div>
                <MessageBox/>
                <Button/>
            </div>
        );
    }
}

export default SBComponent(App, style);
