import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Sentry: importar ANTES que App para capturar errores de inicialización
import './instrumentation'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="cmor-ui-theme">
      <App />
    </ThemeProvider>
  </StrictMode>,
)
