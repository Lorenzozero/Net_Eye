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
        <div className="min-h-screen font-sans bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#0b0f1a] dark:via-[#0b0f1a] dark:to-[#0e1322] transition-colors">
            <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#0b0f1a]/70 backdrop-blur-xl transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between gap-4">
                        <div className="flex items-center gap-6 lg:gap-8">
                            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                                <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                                    <Eye className="w-5 h-5 text-white" />
                                </span>
                                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">NetworkScope</span>
                            </Link>
                            <div className="hidden md:flex items-center gap-1">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                                ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                                                }`}
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
                                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                aria-label="Cambia tema"
                            >
                                {theme === 'dark' ? (
                                    <Sun className="w-5 h-5 text-amber-400" />
                                ) : (
                                    <Moon className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Nav mobile (sotto la barra) */}
                <div className="md:hidden border-t border-slate-200/70 dark:border-white/10 overflow-x-auto">
                    <div className="flex items-center gap-1 px-3 py-2 min-w-max">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isActive
                                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>

            <div className="pt-28 md:pt-24 pb-10">
                <main>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ns-fade-up">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
