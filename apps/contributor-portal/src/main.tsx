import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { bootstrapI18n } from './i18n'
import './index.css'
import { appRouter } from './routes/AppRoutes'

const rootElement = document.getElementById('root')

if (rootElement) {
  void bootstrapI18n().then(() => {
    createRoot(rootElement).render(
      <StrictMode>
        <AuthProvider>
          <RouterProvider router={appRouter} />
        </AuthProvider>
      </StrictMode>,
    )
  })
}
