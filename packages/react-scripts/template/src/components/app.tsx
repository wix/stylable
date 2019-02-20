import React from 'react';
import style from './app.st.css';
import { Content } from './content';
import { Header } from './header';

export interface IAppProps {
    className?: string;
}

export const App: React.FunctionComponent<IAppProps> = props => (
    <div className={style(style.root, props.className || '')} >
        <Header className={style.header} message="Welcome to React with Stylable" />
        <Content className={style.content} mainFile="src/index.tsx" />
    </div>
);
