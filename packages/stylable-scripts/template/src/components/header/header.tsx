import * as React from 'react';
import reactLogo from './react.svg';
import stylableLogo from './stylable.svg';
import './header.css';

export const Header: React.SFC = () => (
    <header className="app-header">
        <img src={reactLogo} className="react-logo" alt="logo" />
        <img src={stylableLogo} className="stylable-logo" alt="logo" />
        <h1 className="app-title">Welcome to React with Stylable</h1>
    </header>
);
