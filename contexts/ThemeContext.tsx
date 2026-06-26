'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Legge la preferenza salvata o quella di sistema. Eseguita solo lato client.
function resolveInitialTheme(): Theme {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');

    // Sincronizza il tema iniziale dal client dopo il mount: localStorage e
    // matchMedia non sono disponibili in SSR, quindi qui setState è necessario.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- init client-only (vedi commento)
        setTheme(resolveInitialTheme());
    }, []);

    // Applica il tema al DOM e lo persiste: sincronizzazione con sistemi esterni.
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        // Return default values instead of throwing
        return {
            theme: 'light' as Theme,
            toggleTheme: () => { }
        };
    }
    return context;
}
