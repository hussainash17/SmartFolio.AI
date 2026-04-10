export function SmartFolioLogo({ className = '' }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 48 48"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="smartfolio-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#4f46e5', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="smartfolio-logo-glow">
                    <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Portfolio/briefcase icon base */}
            <path
                d="M10 18 L10 36 C10 37.5 11 38 12 38 L36 38 C37 38 38 37.5 38 36 L38 18 Z"
                fill="url(#smartfolio-logo-gradient)"
                opacity="0.15"
            />
            <path
                d="M10 18 L10 36 C10 37.5 11 38 12 38 L36 38 C37 38 38 37.5 38 36 L38 18 Z"
                fill="none"
                stroke="url(#smartfolio-logo-gradient)"
                strokeWidth="1.5"
            />

            {/* Briefcase handle */}
            <path
                d="M18 18 L18 15 C18 13.5 19 12 20 12 L28 12 C29 12 30 13.5 30 15 L30 18"
                fill="none"
                stroke="url(#smartfolio-logo-gradient)"
                strokeWidth="1.5"
            />

            {/* AI Neural network nodes */}
            <g filter="url(#smartfolio-logo-glow)">
                {/* Network connections */}
                <line x1="16" y1="24" x2="24" y2="28" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
                <line x1="24" y1="28" x2="32" y2="24" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
                <line x1="16" y1="24" x2="20" y2="32" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
                <line x1="32" y1="24" x2="28" y2="32" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
                <line x1="20" y1="32" x2="28" y2="32" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />

                {/* Network nodes */}
                <circle cx="16" cy="24" r="2.5" fill="currentColor" />
                <circle cx="32" cy="24" r="2.5" fill="currentColor" />
                <circle cx="24" cy="28" r="2.5" fill="currentColor" />
                <circle cx="20" cy="32" r="2" fill="currentColor" />
                <circle cx="28" cy="32" r="2" fill="currentColor" />
            </g>

            {/* Growth chart indicator */}
            <path
                d="M12 34 L16 32 L20 33 L24 30 L28 31 L32 28 L36 26"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.8"
            />
        </svg>
    );
}
