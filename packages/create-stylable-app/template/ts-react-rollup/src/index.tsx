import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './components/app';
import './styles/globals.st.css';
import './styles/reset.st.css';

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.body.appendChild(document.createElement('div'))
);
