import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'         // <-- important: Tailwind entry
import App from './App.jsx'      // use the correct extension for JSX

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
