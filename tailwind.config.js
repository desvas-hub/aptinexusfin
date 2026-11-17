export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'] },
    colors: { ink: { 950: '#ffffff', 900: '#f5f5f7', 800: '#ffffff' }, nexus: { blue: '#007AFF', violet: '#AF52DE', cyan: '#5AC8FA' } },
  } },
}
