import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Shield, Clock, Flame } from 'lucide-react'

export function Home() {
  const [pasteId, setPasteId] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pasteId.trim()) {
      navigate(`/${pasteId.trim()}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Secure Pastebin
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Share text securely with end-to-end encryption
        </p>
        
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex">
            <input
              type="text"
              value={pasteId}
              onChange={(e) => setPasteId(e.target.value)}
              placeholder="Enter paste ID to view"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Shield className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            End-to-End Encrypted
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your data is encrypted in your browser before being sent to our servers
          </p>
        </div>
        
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Clock className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Auto-Expiring
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Set custom expiration times to automatically delete your pastes
          </p>
        </div>
        
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Flame className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Burn After Read
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Pastes can be configured to self-destruct after being viewed once
          </p>
        </div>
      </div>
    </div>
  )
}