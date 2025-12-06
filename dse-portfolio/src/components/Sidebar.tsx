import React from 'react';
import { LayoutDashboard, PieChart, TrendingUp, List, Newspaper, Settings, LogOut } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', active: true },
        { icon: PieChart, label: 'Holdings', active: false },
        { icon: TrendingUp, label: 'Market', active: false },
        { icon: List, label: 'Watchlist', active: false },
        { icon: Newspaper, label: 'News', active: false },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <aside className={clsx(
                "fixed top-0 left-0 h-full w-64 bg-white dark:bg-surface-card-dark border-r border-gray-200 dark:border-gray-800 z-50 transition-transform duration-300 lg:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h1 className="text-2xl font-bold text-primary">DSE Portfolio</h1>
                </div>

                <nav className="p-4 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                item.active
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-gray-800">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <Settings size={20} />
                        Settings
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-2">
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
