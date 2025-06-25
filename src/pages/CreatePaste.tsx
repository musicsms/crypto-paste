import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, Send, Clock, Flame, Lock } from 'lucide-react'
import { CryptoUtils } from '../utils/crypto'

export function CreatePaste() {
  const [content, setContent] = useState('')
  const [expirationOption, setExpirationOption] = useState('1h')
  const [burnAfterRead, setBurnAfterRead] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ url: string; copied: boolean } | null>(null)
  const navigate = useNavigate()

  const expirationOptions = [
    { value: '10m', label: '10 minutes', ms: 10 * 60 * 1000 },
    { value: '1h', label: '1 hour', ms: 60 * 60 * 1000 },
    { value: '1d', label: '1 day', ms: 24 * 60 * 60 * 1000 },
    { value: '1w', label: '1 week', ms: 7 * 24 * 60 * 60 * 1000 },
    { value: 'never', label: 'Never', ms: 0 }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsLoading(true)
    try {
      const key = await CryptoUtils.generateKey()
      const { encrypted, iv } = await CryptoUtils.encrypt(content, key)
      const keyString = await CryptoUtils.exportKey(key)
      
      const expirationMs = expirationOptions.find(opt => opt.value === expirationOption)?.ms || 0
      const expiresAt = expirationMs > 0 ? Date.now() + expirationMs : undefined

      const response = await fetch(`${window.location.origin.includes('localhost') ? '' : 'https://crypto-paste-api.bopbap.workers.dev'}/api/pastes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: JSON.stringify({ encrypted, iv }),
          expiresAt,
          burnAfterRead
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create paste')
      }

      const { id }: { id: string } = await response.json()
      const encodedKey = CryptoUtils.encodeKeyForUrl(keyString)
      const url = `${window.location.origin}/${id}#${encodedKey}`
      
      setResult({ url, copied: false })
    } catch (error) {
      console.error('Error creating paste:', error)
      alert('Failed to create paste. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (result) {
      await navigator.clipboard.writeText(result.url)
      setResult({ ...result, copied: true })
      setTimeout(() => {
        setResult({ ...result, copied: false })
      }, 2000)
    }
  }

  const createAnother = () => {
    setContent('')
    setResult(null)
    setExpirationOption('1h')
    setBurnAfterRead(false)
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Paste Created Successfully
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Share this URL
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={result.url}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-md transition-colors"
                >
                  {result.copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> This URL contains the encryption key. Anyone with this URL can decrypt and read your paste.
                {burnAfterRead && ' This paste will be deleted after the first view.'}
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={createAnother}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                Create Another
              </button>
              <button
                onClick={() => navigate(result.url.split(window.location.origin)[1])}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                View Paste
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create New Paste
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your text here..."
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                required
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="expiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Expiration
                </label>
                <select
                  id="expiration"
                  value={expirationOption}
                  onChange={(e) => setExpirationOption(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {expirationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="burnAfterRead"
                  checked={burnAfterRead}
                  onChange={(e) => setBurnAfterRead(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="burnAfterRead" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  <Flame className="inline h-4 w-4 mr-1 text-red-500" />
                  Burn after read
                </label>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <div className="flex items-start">
                <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    End-to-End Encryption
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Your content will be encrypted in your browser before being sent to our servers. 
                    The encryption key will be included in the URL hash and never sent to our servers.
                  </p>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!content.trim() || isLoading}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors font-medium"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Create Paste
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}