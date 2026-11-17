import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
document.documentElement.dataset.theme = localStorage.getItem('aptinexus.theme') === 'dark' ? 'dark' : 'light'
document.documentElement.dataset.reduceMotion = localStorage.getItem('aptinexus.reduceMotion') ?? 'false'
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

