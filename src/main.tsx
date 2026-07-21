import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AnalyticsConsent from './AnalyticsConsent'
import './styles.css'
createRoot(document.getElementById('root')!).render(<StrictMode><App /><AnalyticsConsent /></StrictMode>)
