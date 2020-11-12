import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './app';
import './reset.st.css';

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.body.appendChild(document.createElement('div'))
);
