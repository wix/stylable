import * as React from 'react';
import {properties, stylable} from 'wix-react-tools';

import reactLogo from './react.svg';
import stylableLogo from './stylable.svg';
import style from './header.st.css';

export const Header: React.SFC = stylable(style)(properties(() => (
    <header>
        <img src={reactLogo} className="reactLogo" alt="logo" />
        <img src={stylableLogo} className="stylableLogo" alt="logo" />
        <h1 className="title">Welcome to React with Stylable</h1>
    </header>
)));
