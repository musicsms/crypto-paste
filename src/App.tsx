import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { CreatePaste } from './pages/CreatePaste'
import { ViewPaste } from './pages/ViewPaste'
import { Home } from './pages/Home'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreatePaste />} />
            <Route path="/:id" element={<ViewPaste />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
