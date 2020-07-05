import React from 'react';
import { st, classes } from './header.st.css';
import stylableLogo from './stylable.svg';

export interface HeaderProps {
    className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
    return (
        <header className={st(classes.root, className)}>
            <h1 className={classes.title}>
                Hello{' '}
                <a
                    className={classes.anchor}
                    href="https://stylable.io"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Stylable!
                </a>{' '}
                <img className={classes.icon} src={stylableLogo} width={50} height={50} alt="" />
            </h1>
        </header>
    );
};
