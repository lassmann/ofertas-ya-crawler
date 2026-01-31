import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { UnmatchedProducts } from './pages/UnmatchedProducts'
import { MatchedProducts } from './pages/MatchedProducts'
import { Compare } from './pages/Compare'
import { Products } from './pages/Products'
import { AdminFeatured } from './pages/AdminFeatured'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/unmatched" element={<UnmatchedProducts />} />
        <Route path="/matched" element={<MatchedProducts />} />
        <Route path="/compare/:id" element={<Compare />} />
        <Route path="/admin/featured" element={<AdminFeatured />} />
      </Routes>
    </Layout>
  )
}

export default App
