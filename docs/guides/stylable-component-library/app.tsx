import * as React from 'react';
import {SBComponent} from 'stylable-react-component';
import Button from './button';
import style from './app.st.css';

export interface AppProps {
    className: string;
}

class App extends React.Component<AppProps, {}> {
    static defaultProps: AppProps = {className: ''};

    render() {
        return (
            <div>
                <Button className="cancel">Cancel</Button>
            </div>
        );
    }
}

export default SBComponent(App, style);
