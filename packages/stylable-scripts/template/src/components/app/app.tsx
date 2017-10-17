import * as React from 'react';
import './app.css';
import {Header} from '../header';
import {Content} from '../content';

export const App: React.SFC = () => (
    <div className="app">
        <Header />
        <Content />
    </div>
);
