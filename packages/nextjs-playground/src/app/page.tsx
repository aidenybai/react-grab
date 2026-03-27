'use client'

import { useState, useCallback } from 'react'
import { exec } from './actions'

export default function Home() {
  const [command, setCommand] = useState('echo "hello from the server"')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    setLoading(true)
    setError('')
    setOutput('')
    try {
      const result = await exec(command)
      if ('error' in result) {
        setError(result.error)
      } else {
        setOutput(result.stdout)
      }
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [command])

  return (
    <div style={{ fontFamily: 'monospace', padding: 32, maxWidth: 720 }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>
        Next.js Server Exec Playground
      </h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 13 }}>
        Executes bash commands on the server via Server Action →{' '}
        <code>child_process.execSync</code>. No API routes.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="Enter a bash command..."
          style={{
            flex: 1,
            padding: '8px 12px',
            fontFamily: 'monospace',
            fontSize: 14,
            border: '1px solid #333',
            borderRadius: 4,
            background: '#111',
            color: '#eee',
          }}
        />
        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: '8px 16px',
            fontFamily: 'monospace',
            fontSize: 14,
            background: loading ? '#333' : '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'running...' : 'run'}
        </button>
      </div>

      {error && (
        <pre
          style={{
            padding: 16,
            background: '#2a0000',
            color: '#ff6b6b',
            borderRadius: 4,
            overflow: 'auto',
            fontSize: 13,
          }}
        >
          {error}
        </pre>
      )}

      {output && (
        <pre
          style={{
            padding: 16,
            background: '#0a0a0a',
            color: '#0f0',
            borderRadius: 4,
            overflow: 'auto',
            fontSize: 13,
            whiteSpace: 'pre-wrap',
          }}
        >
          {output}
        </pre>
      )}
    </div>
  )
}
