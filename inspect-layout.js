import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Wait a bit for any dynamic content
  await page.waitForTimeout(2000);
  
  const result = await page.evaluate(() => {
    // Find the main demo container
    const container = document.querySelector('.flex.flex-col.gap-2.pt-4');
    if (!container) {
      return JSON.stringify({error: 'Container not found', body: document.body.innerHTML.slice(0, 500)});
    }

    const rootRect = container.getBoundingClientRect();
    const children = Array.from(container.children);
    const results = children.map((child, i) => {
      const rect = child.getBoundingClientRect();
      const computed = getComputedStyle(child);
      return {
        index: i,
        tag: child.tagName,
        class: child.className.toString().slice(0, 60),
        display: computed.display,
        text: child.textContent?.slice(0, 50),
        rect: {
          top: Math.round(rect.top - rootRect.top),
          left: Math.round(rect.left - rootRect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      };
    });

    return JSON.stringify({
      rootRect: { width: Math.round(rootRect.width), height: Math.round(rootRect.height) },
      rootDisplay: getComputedStyle(container).display,
      rootFlexDir: getComputedStyle(container).flexDirection,
      rootGap: getComputedStyle(container).gap,
      childCount: children.length,
      children: results
    }, null, 2);
  });
  
  console.log(result);
  
  await browser.close();
})();
