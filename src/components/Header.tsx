import { Link } from 'react-router-dom'
import { FileText, Plus, Shield } from 'lucide-react'

export function Header() {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2 text-gray-900 dark:text-white">
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-bold">CryptoPaste</span>
          </Link>
          
          <nav className="flex items-center space-x-4">
            <Link
              to="/"
              className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>View</span>
            </Link>
            <Link
              to="/create"
              className="flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Paste</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}