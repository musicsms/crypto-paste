import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Copy, Check, Download, AlertTriangle, Lock, Flame, Code, FileText } from 'lucide-react'
import { CryptoUtils } from '../utils/crypto'
import { SyntaxHighlighter } from '../components/SyntaxHighlighter'

interface PasteData {
  content: string
  burnAfterRead: boolean
  createdAt: number
}

export function ViewPaste() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [paste, setPaste] = useState<PasteData | null>(null)
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showSyntaxHighlighting, setShowSyntaxHighlighting] = useState(true)

  useEffect(() => {
    if (!id) {
      setError('Invalid paste ID')
      setIsLoading(false)
      return
    }

    const keyFromHash = window.location.hash.substring(1)
    if (!keyFromHash) {
      setError('Encryption key not found in URL')
      setIsLoading(false)
      return
    }

    fetchAndDecryptPaste(id, keyFromHash)
  }, [id])

  const fetchAndDecryptPaste = async (pasteId: string, encodedKey: string) => {
    try {
      const response = await fetch(`${window.location.origin.includes('localhost') ? '' : 'https://crypto-paste-api.bopbap.workers.dev'}/api/pastes/${pasteId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Paste not found or has expired')
        } else {
          setError('Failed to fetch paste')
        }
        return
      }

      const pasteData: PasteData = await response.json()
      setPaste(pasteData)

      const keyString = CryptoUtils.decodeKeyFromUrl(encodedKey)
      const key = await CryptoUtils.importKey(keyString)
      const { encrypted, iv } = JSON.parse(pasteData.content)
      const decrypted = await CryptoUtils.decrypt(encrypted, key, iv)
      
      setDecryptedContent(decrypted)
    } catch (error) {
      console.error('Error fetching paste:', error)
      setError('Failed to decrypt paste. The URL may be corrupted.')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (decryptedContent) {
      await navigator.clipboard.writeText(decryptedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadPaste = () => {
    if (decryptedContent) {
      const blob = new Blob([decryptedContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paste-${id}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-red-800 dark:text-red-200">
                Error Loading Paste
              </h2>
              <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Encrypted Paste
              </h2>
              {paste?.burnAfterRead && (
                <div className="flex items-center text-red-600 dark:text-red-400">
                  <Flame className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Burn After Read</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSyntaxHighlighting(!showSyntaxHighlighting)}
                className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
              >
                {showSyntaxHighlighting ? <FileText className="h-4 w-4 mr-1" /> : <Code className="h-4 w-4 mr-1" />}
                {showSyntaxHighlighting ? 'Plain Text' : 'Highlight'}
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
              >
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={downloadPaste}
                className="flex items-center px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </button>
            </div>
          </div>
          
          {paste && (
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Created: {new Date(paste.createdAt).toLocaleString()}
            </div>
          )}
        </div>
        
        <div className="p-6">
          {paste?.burnAfterRead && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex items-center">
                <Flame className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  This paste will be permanently deleted after viewing.
                </p>
              </div>
            </div>
          )}
          
          {showSyntaxHighlighting ? (
            <SyntaxHighlighter code={decryptedContent || ''} />
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 font-mono leading-relaxed overflow-x-auto">
                {decryptedContent}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}