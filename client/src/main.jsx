import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'
import { Auth0ProviderWithNavigate } from './auth0-provider'   // ← ADD THIS

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0ProviderWithNavigate>   {/* ← WRAP APP */}
      <App />
    </Auth0ProviderWithNavigate>
  </StrictMode>,
)