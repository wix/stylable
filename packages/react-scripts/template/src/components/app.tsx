import * as React from 'react';
import {Header} from './header';
import {Content} from './content';
import style from './app.st.css';

export const App: React.SFC<{className?: string}> = (props) => (
    <div {...style('root', {}, props)}>
        <Header message="Welcome to React with Stylable" />
        <Content mainFile="src/index.tsx" />
    </div>
);
