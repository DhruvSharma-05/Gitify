import React from 'react'
import Flow from './components/Flow.jsx'

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>GitHub Visual — Interactive demo</h1>
        <p>Click actions to see files move through working/stage/commit/push.</p>
      </header>
      <main>
        <Flow />
      </main>
    </div>
  )
}
