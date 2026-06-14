// End-to-end smoke test: boots the built app in a real browser with NO backend,
// drives the lesson terminal, and asserts the offline engine responds. This covers
// the app shell, the terminal component, and the offline simulator in one pass.
//
// Usage: build + serve the app (npm run preview), then `E2E_URL=... npm run e2e`.
import { chromium } from 'playwright'

const URL = process.env.E2E_URL || 'http://localhost:4173'
const TIMEOUT = 30000

const browser = await chromium.launch()
let failed = false
try {
  const context = await browser.newContext()
  // Land directly on Lesson 1 (which has the terminal) and skip the intro.
  await context.addInitScript(() => {
    localStorage.setItem('gitify_current_lesson', '1')
    localStorage.setItem('gitify_session_id', 'e2e-session')
  })
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT })

  // The terminal input should render.
  const input = page.locator('input[placeholder*="Type command"]')
  await input.waitFor({ state: 'visible', timeout: TIMEOUT })

  // Run a command. With no backend reachable, the offline simulator handles it.
  await input.fill('git init')
  await input.press('Enter')

  // The offline engine should produce real output...
  await page.getByText(/Initialized empty Git repository/i).first().waitFor({ timeout: TIMEOUT })
  // ...and the UI should clearly signal we're in offline mode.
  await page.getByText(/Offline Mode/i).first().waitFor({ timeout: TIMEOUT })

  console.log('E2E PASS: app loads, terminal runs a command, offline engine responds')
} catch (e) {
  console.error('E2E FAIL:', e.message)
  failed = true
} finally {
  await browser.close()
}
process.exit(failed ? 1 : 0)
