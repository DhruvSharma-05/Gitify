const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto('http://localhost:5173');
  await p.waitForTimeout(1800);
  const menuBtn = await p.$('.menu-btn');
  if (menuBtn) { await menuBtn.click(); await p.waitForTimeout(500); }
  const btns = await p.$$('button, .lesson-item');
  for (const btn of btns) {
    const txt = await btn.innerText().catch(() => '');
    if (/remote|collab|lesson\s*6/i.test(txt)) { await btn.click(); await p.waitForTimeout(1200); break; }
  }
  const backdrop = await p.$('.sidebar-backdrop');
  if (backdrop) await backdrop.click();
  await p.waitForTimeout(400);
  const exBtns = await p.$$('button');
  for (const btn of exBtns) {
    const txt = await btn.innerText().catch(() => '');
    if (/exercise/i.test(txt)) { await btn.click(); await p.waitForTimeout(1500); break; }
  }
  const info = await p.evaluate(() => {
    const leftCol = document.querySelector('[style*="flex: 1.5"]') || document.querySelector('.lesson-left-column');
    const rl = document.querySelector('.remote-layout');
    const fetchP = document.querySelector('.fetch-panel');
    const prP = document.querySelector('.pr-panel');
    const forkP = document.querySelector('.fork-panel');
    const h1 = document.querySelector('.lesson-header h1');
    const h2 = document.querySelector('.lesson-header h2');
    return {
      leftColW: leftCol ? leftCol.offsetWidth : null,
      remoteLayoutW: rl ? rl.offsetWidth : null,
      fetchPanelW: fetchP ? fetchP.offsetWidth : null,
      prPanelW: prP ? prP.offsetWidth : null,
      forkPanelW: forkP ? forkP.offsetWidth : null,
      h1: h1 ? { fs: getComputedStyle(h1).fontSize, txt: h1.textContent.slice(0,30) } : null,
      h2: h2 ? { fs: getComputedStyle(h2).fontSize, txt: h2.textContent.slice(0,30) } : null,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
