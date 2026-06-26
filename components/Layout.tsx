'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import NavActions from '@/components/NavActions';

export default function Layout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();

    const navItems = [
        { name: 'Dashboard', href: '/' },
        { name: 'Dispositivi', href: '/dispositivi' },
        { name: 'Mappa', href: '/mappa' },
        { name: 'Traffico', href: '/traffico' },
        { name: 'Impostazioni', href: '/impostazioni' },
    ];

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans transition-colors">
            <nav className="fixed w-full top-0 left-0 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center gap-2">
                                <Eye className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                                <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">NetworkScope</span>
                            </div>
                            <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`${isActive
                                                ? 'border-indigo-500 text-gray-900 dark:text-white'
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                                        >
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <NavActions />
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                aria-label="Toggle dark mode"
                            >
                                {theme === 'dark' ? (
                                    <Sun className="w-5 h-5 text-yellow-500" />
                                ) : (
                                    <Moon className="w-5 h-5 text-gray-700" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="pt-24 pb-10">
                <main>
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
