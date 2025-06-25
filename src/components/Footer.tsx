import { Github, Send } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            © {currentYear} CryptoPaste. All rights reserved.
          </div>
          
          <div className="flex items-center space-x-6">
            <a
              href="https://github.com/musicsms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Github className="h-5 w-5" />
              <span className="text-sm">GitHub</span>
            </a>
            
            <a
              href="https://t.me/bopbop1101"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Send className="h-5 w-5" />
              <span className="text-sm">Telegram</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
} 