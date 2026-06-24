/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './apps/web/index.html',
    './apps/web/src/**/*.{js,ts,svelte}',
  ],
  theme: {
    extend: {
      // Evidence.dev Color System
      colors: {
        // Primary - Evidence Blue
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // Evidence Blue
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Cool Gray (主色调)
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        // Success - Green
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Warning - Amber
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Error - Red
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Info - Sky Blue
        info: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Gemini Color System - Gradient Base Colors
        gemini: {
          blue: '#4285F4',      // Google Blue
          blueHover: '#3B78E7', // Blue hover state
          purple: '#8B5CF6',    // Purple mid-point
          purpleHover: '#7C4FDB',
          pink: '#EC4899',      // Pink end
          pinkHover: '#D93D85',
          violet: '#A855F7',    // Alternative purple
        },
      },
      // Gemini Gradient Backgrounds
      backgroundImage: {
        // Primary gradient - blue → purple → pink
        'gemini-primary': 'linear-gradient(135deg, #4285F4 0%, #8B5CF6 50%, #EC4899 100%)',
        'gemini-primary-hover': 'linear-gradient(135deg, #3B78E7 0%, #7C4FDB 50%, #D93D85 100%)',

        // Text gradient - horizontal
        'gemini-text': 'linear-gradient(90deg, #4285F4 0%, #A855F7 50%, #EC4899 100%)',

        // Subtle gradient for backgrounds
        'gemini-subtle': 'linear-gradient(135deg, rgba(66, 133, 244, 0.1) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)',

        // Card gradient overlay
        'gemini-card': 'linear-gradient(135deg, rgba(66, 133, 244, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)',

        // Border gradient (for gradient borders effect)
        'gemini-border': 'linear-gradient(135deg, #4285F4 0%, #EC4899 100%)',

        // Success gradient
        'gemini-success': 'linear-gradient(135deg, #22C55E 0%, #10B981 100%)',

        // Warning gradient
        'gemini-warning': 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      },
      // Typography - Inter Font (Google Sans alternative)
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'Courier New', 'monospace'],
      },
      fontSize: {
        xs: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],      // 11px
        sm: ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0' }],        // 14px
        base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],            // 16px
        lg: ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em' }],  // 18px
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em' }],   // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],  // 36px
      },
      // Spacing System (4px base)
      spacing: {
        '0': '0',
        '1': '0.25rem',   // 4px
        '2': '0.5rem',    // 8px
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '5': '1.25rem',   // 20px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '10': '2.5rem',   // 40px
        '12': '3rem',     // 48px
        '16': '4rem',     // 64px
        '20': '5rem',     // 80px
        '24': '6rem',     // 96px
      },
      // Border Radius
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',   // 2px
        DEFAULT: '0.25rem', // 4px
        'md': '0.375rem',   // 6px
        'lg': '0.5rem',     // 8px
        'xl': '0.75rem',    // 12px
        '2xl': '1rem',      // 16px
        '3xl': '1.5rem',    // 24px - Gemini style
        'full': '9999px',
      },
      // Box Shadow - Enhanced with Gemini colors
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'none': 'none',
        // Gemini colored shadows
        'gemini-sm': '0 2px 8px rgba(66, 133, 244, 0.15)',
        'gemini-md': '0 4px 16px rgba(66, 133, 244, 0.2)',
        'gemini-lg': '0 8px 32px rgba(66, 133, 244, 0.25)',
        'gemini-xl': '0 16px 48px rgba(66, 133, 244, 0.3)',
        'glow': '0 0 20px rgba(139, 92, 246, 0.5)',
        'glow-sm': '0 0 10px rgba(139, 92, 246, 0.3)',
        'glow-lg': '0 0 30px rgba(139, 92, 246, 0.6)',
      },
      // Animation - Enhanced with more effects
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-in-fast': 'fadeIn 0.15s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.5s ease-out',
        'gradient-shift': 'gradientShift 3s ease infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 30px rgba(139, 92, 246, 0.8)' },
        },
      },
      // Backdrop blur
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
  ],
}
