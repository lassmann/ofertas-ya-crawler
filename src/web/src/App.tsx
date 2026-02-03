import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './pages/Dashboard'
import { UnmatchedProducts } from './pages/UnmatchedProducts'
import { MatchedProducts } from './pages/MatchedProducts'
import { Compare } from './pages/Compare'
import { Products } from './pages/Products'
import { AdminFeatured } from './pages/AdminFeatured'
import { Login } from './pages/Login'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/unmatched" element={<ProtectedRoute><UnmatchedProducts /></ProtectedRoute>} />
        <Route path="/matched" element={<ProtectedRoute><MatchedProducts /></ProtectedRoute>} />
        <Route path="/compare/:id" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
        <Route path="/admin/featured" element={<ProtectedRoute><AdminFeatured /></ProtectedRoute>} />
      </Routes>
    </Layout>
  )
}

export default App
