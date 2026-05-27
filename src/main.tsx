import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/themes.css'
import './styles/index.css'

// Apply the default theme attribute immediately so there is no flash of
// unstyled content before ThemeProvider restores the persisted value.
document.documentElement.setAttribute('data-theme', 'light')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
