import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } })
await page.addInitScript(() => localStorage.setItem('gitify_current_lesson', '7'))
await page.goto('http://localhost:5178/')
await page.waitForTimeout(1500)

await page.locator('.rebase-confirm').click()
await page.waitForTimeout(90)

const info = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('.clean-history.active .clean-node')]
  return nodes.map((n, i) => {
    const dot = n.querySelector('span')
    return {
      i,
      nodeAnim: n.getAnimations().map(a => ({ name: a.animationName, delay: a.effect.getTiming().delay })),
      dotAnim: dot.getAnimations().map(a => ({ name: a.animationName, delay: a.effect.getTiming().delay })),
    }
  })
})
console.log(JSON.stringify(info, null, 2))

await page.locator('.rebase-panel.result-panel').screenshot({ path: 'C:/Users/Homework/AppData/Local/Temp/claude/c--Users-Homework-Desktop-Gitify/a7e5ac4e-6042-48de-99f7-8582ad5a574b/scratchpad/rebase_midflight.png' })
await browser.close()
