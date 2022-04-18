import type React from 'react';
import { st, classes } from './app.st.css';
import { Header } from './header';

export interface AppProps {
    className?: string;
}

export const App: React.FC<AppProps> = ({ className }) => {
    return (
        <main className={st(classes.root, className)}>
            <Header className={classes.header} />
        </main>
    );
};
