/* test.tsx */
import * as React from 'react';
import {SBComponent} from 'stylable-react-component';
import style from './test.st.css';

interface TestProps {
    name: string;
}

class Test extends React.Component<TestProps, {}> {
    static defaultProps: TestProps = {
        name: 'Anonymous'
    };

    render() {
        return (
            <div>
                <span>Hello </span>
                <span className="name">{this.props.name}</span>
            </div>
        );
    }
}

export default SBComponent(Test, style);
