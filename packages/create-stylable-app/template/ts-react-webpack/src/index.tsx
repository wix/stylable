import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './app';
import './reset.st.css';

const container = document.body.appendChild(document.createElement('div'));
ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    container
);
