/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#1A73E8',
                    dark: '#1557B0',
                },
                positive: '#00A676',
                negative: '#E53935',
                neutral: '#9E9E9E',
                surface: {
                    light: '#F6F8FA',
                    dark: '#0E1117',
                    card: {
                        light: '#FFFFFF',
                        dark: '#161B22',
                    }
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    darkMode: 'class',
    plugins: [],
}
