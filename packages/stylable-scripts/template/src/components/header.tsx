import * as React from 'react';
import {properties, stylable} from 'wix-react-tools';

import reactLogo from './logos/react.svg';
import stylableLogo from './logos/stylable.svg';
import style from './header.st.css';

interface HeaderProps extends properties.Props {
    message: string;
}

export const Header = stylable(style)(properties((props: HeaderProps) => (
    <header>
        <img src={reactLogo} className="reactLogo" alt="logo" />
        <img src={stylableLogo} className="stylableLogo" alt="logo" />
        <h1 className="title">{props.message}</h1>
    </header>
)));
