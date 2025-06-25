import { useEffect, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-yaml'

interface SyntaxHighlighterProps {
  code: string
  language?: string
  className?: string
}

const languageMap: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  sh: 'bash',
  yml: 'yaml',
}

function detectLanguage(code: string): string {
  const patterns = [
    { regex: /^\s*<[^>]+>/, lang: 'markup' },
    { regex: /^\s*{[\s\S]*}$/, lang: 'json' },
    { regex: /^\s*(function|const|let|var|=>|import|export)/, lang: 'javascript' },
    { regex: /^\s*(interface|type|namespace|declare)/, lang: 'typescript' },
    { regex: /^\s*(def|import|from|class|if __name__)/, lang: 'python' },
    { regex: /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)/, lang: 'sql' },
    { regex: /^\s*([.#][\w-]+|body|html)/, lang: 'css' },
    { regex: /^\s*(#!\/bin|cd|ls|grep|find|echo)/, lang: 'bash' },
    { regex: /^\s*(-{3}|[\w-]+:)/, lang: 'yaml' },
  ]

  const trimmedCode = code.trim().toLowerCase()
  
  for (const pattern of patterns) {
    if (pattern.regex.test(trimmedCode)) {
      return pattern.lang
    }
  }
  
  return 'text'
}

export function SyntaxHighlighter({ code, language, className = '' }: SyntaxHighlighterProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('')
  const [detectedLang, setDetectedLang] = useState<string>('text')

  useEffect(() => {
    const lang = language || detectLanguage(code)
    const mappedLang = languageMap[lang] || lang
    setDetectedLang(mappedLang)

    if (mappedLang !== 'text' && Prism.languages[mappedLang]) {
      try {
        const highlighted = Prism.highlight(code, Prism.languages[mappedLang], mappedLang)
        setHighlightedCode(highlighted)
      } catch (error) {
        console.warn('Syntax highlighting failed:', error)
        setHighlightedCode(code)
      }
    } else {
      setHighlightedCode(code)
    }
  }, [code, language])

  return (
    <div className={`relative ${className}`}>
      {detectedLang !== 'text' && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
          {detectedLang}
        </div>
      )}
      <pre className="!bg-gray-900 !text-gray-100 rounded-md p-4 overflow-x-auto text-sm leading-relaxed">
        <code
          className={`language-${detectedLang}`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  )
}