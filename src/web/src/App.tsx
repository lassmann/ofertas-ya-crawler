import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { UnmatchedProducts } from './pages/UnmatchedProducts'
import { MatchedProducts } from './pages/MatchedProducts'
import { Compare } from './pages/Compare'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/unmatched" element={<UnmatchedProducts />} />
        <Route path="/matched" element={<MatchedProducts />} />
        <Route path="/compare/:id" element={<Compare />} />
      </Routes>
    </Layout>
  )
}

export default App
