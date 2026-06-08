import { readFileSync } from 'node:fs'

const apiSource = readFileSync('src/api.js', 'utf8')

if (!apiSource.includes('VITE_API_BASE_URL')) {
  console.error('src/api.js must read VITE_API_BASE_URL')
  process.exit(1)
}

console.log('frontend smoke test passed')
