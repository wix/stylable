import React from 'react';
import ReactDOM from 'react-dom';
import './globals.st.css';
import { App } from './app';

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.body.appendChild(document.createElement('div'))
);
