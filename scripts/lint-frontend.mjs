import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const blocked = [/http:\/\/localhost:8000/, /127\.0\.0\.1:8000/]
const failures = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      walk(path)
      continue
    }
    if (!/\.(js|jsx|ts|tsx)$/.test(path)) continue
    const text = readFileSync(path, 'utf8')
    for (const pattern of blocked) {
      if (pattern.test(text)) {
        failures.push(`${path}: contains ${pattern}`)
      }
    }
  }
}

walk('src')

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('frontend lint passed')
