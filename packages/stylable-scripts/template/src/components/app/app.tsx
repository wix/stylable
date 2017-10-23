import * as React from 'react';
import {Header} from '../header';
import {Content} from '../content';
import style from './app.st.css';

export const App: React.SFC = () => (
    <div className={style.root}>
        <Header />
        <Content />
    </div>
);
