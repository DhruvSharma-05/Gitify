const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto('http://localhost:5173');
  await p.waitForTimeout(1800);

  // Open sidebar
  const menuBtn = await p.$('.menu-btn, [aria-label="Open sidebar menu"]');
  if (menuBtn) { await menuBtn.click(); await p.waitForTimeout(500); }

  // Click lesson 6
  const btns = await p.$$('button, .lesson-item');
  for (const btn of btns) {
    const txt = await btn.innerText().catch(() => '');
    if (/remote|collab|lesson\s*6/i.test(txt)) {
      await btn.click();
      await p.waitForTimeout(1500);
      break;
    }
  }

  // Close sidebar if open
  const backdrop = await p.$('.sidebar-backdrop.open');
  if (backdrop) await backdrop.click();
  await p.waitForTimeout(400);

  await p.screenshot({ path: 'ss_l6_learning.png' });
  console.log('learning mode');

  // Switch to exercise mode
  const exBtns = await p.$$('button');
  for (const btn of exBtns) {
    const txt = await btn.innerText().catch(() => '');
    if (/exercise/i.test(txt)) { await btn.click(); await p.waitForTimeout(2000); break; }
  }
  await p.screenshot({ path: 'ss_l6_exercise.png' });
  console.log('exercise mode');
  await p.screenshot({ path: 'ss_l6_full.png', fullPage: true });
  console.log('full page');

  // Get z-index and position info for overlapping elements
  const overlap = await p.evaluate(() => {
    const all = document.querySelectorAll('*');
    const stacked = [];
    all.forEach(el => {
      const s = getComputedStyle(el);
      const z = parseInt(s.zIndex);
      if (!isNaN(z) && z > 0 && el.offsetWidth > 50 && el.offsetHeight > 20) {
        stacked.push({ tag: el.tagName, cls: el.className.toString().slice(0, 80), z, pos: s.position, w: el.offsetWidth, h: el.offsetHeight });
      }
    });
    return stacked.sort((a, b) => b.z - a.z).slice(0, 20);
  });
  console.log('Stacked elements:', JSON.stringify(overlap, null, 2));

  await b.close();
  console.log('done');
})().catch(e => { console.error(e.message); process.exit(1); });
