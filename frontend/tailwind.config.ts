import type { Config } from "tailwindcss";

export default {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float-delayed 8s ease-in-out infinite',
        'float-slow': 'float-slow 10s ease-in-out infinite',
        'float-drift': 'float-drift 15s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'fade-in-up': 'fade-in-up 0.55s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'fade-in-down': 'fade-in-down 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'fade-in-left': 'fade-in-left 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'fade-in-right': 'fade-in-right 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'fade-in-scale': 'fade-in-scale 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'slide-in': 'slide-in-right 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'bounce-in': 'bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        'bounce-in-up': 'bounce-in-up 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 25s linear infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
        'scroll-indicator': 'scroll-indicator 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          from: { opacity: '0', transform: 'translateY(-16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-left': {
          from: { opacity: '0', transform: 'translateX(-28px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in-right': {
          from: { opacity: '0', transform: 'translateX(28px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in-scale': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(36px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.88)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.7)' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'bounce-in-up': {
          '0%': { opacity: '0', transform: 'translateY(50px) scale(0.85)' },
          '70%': { transform: 'translateY(-8px) scale(1.02)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0) rotate(0)' },
          '33%': { transform: 'translateY(-12px) rotate(2deg)' },
          '66%': { transform: 'translateY(6px) rotate(-1deg)' },
        },
        'float-delayed': {
          '0%, 100%': { transform: 'translateY(0) rotate(0)' },
          '33%': { transform: 'translateY(10px) rotate(-2deg)' },
          '66%': { transform: 'translateY(-14px) rotate(1deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-18px)' },
        },
        'float-drift': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(12px, -8px)' },
          '50%': { transform: 'translate(-8px, 12px)' },
          '75%': { transform: 'translate(6px, 6px)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.05)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.1)' },
          '50%': { boxShadow: '0 0 50px rgba(99, 102, 241, 0.25)' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(244, 63, 94, 0.15), 0 0 60px rgba(244, 63, 94, 0.05)'
          },
          '50%': {
            boxShadow: '0 0 40px rgba(244, 63, 94, 0.25), 0 0 80px rgba(244, 63, 94, 0.1)'
          },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'wave': {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(0.65)' },
        },
        'scroll-indicator': {
          '0%, 100%': { opacity: '1', transform: 'translateY(0)' },
          '50%': { opacity: '0.4', transform: 'translateY(8px)' },
        },
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'glass-dark': '0 4px 24px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.2)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.10), 0 4px 16px rgba(0, 0, 0, 0.06)',
        'glass-hover-dark': '0 12px 40px rgba(0, 0, 0, 0.50), 0 4px 16px rgba(0, 0, 0, 0.30)',
        'glow-rose': '0 0 30px rgba(244, 63, 94, 0.2), 0 0 60px rgba(244, 63, 94, 0.08)',
        'glow-blue': '0 0 30px rgba(14, 165, 233, 0.2), 0 0 60px rgba(14, 165, 233, 0.08)',
      },
      backdropBlur: {
        'xs': '2px',
        '2xl': '40px',
      },
    },
  },
  plugins: [],
} satisfies Config;