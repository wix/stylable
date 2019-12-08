import React from 'react';
import { classes, style } from './app.st.css';
import { Content } from './content';
import { Header } from './header';

export interface IAppProps {
    className?: string;
}

export const App: React.FunctionComponent<IAppProps> = props => (
    <div className={style(classes.root, props.className || '')}>
        <Header className={classes.header} message="Welcome to React with Stylable" />
        <Content className={classes.content} mainFile="src/index.tsx" />
    </div>
);
