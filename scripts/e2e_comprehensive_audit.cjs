const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickByText(page, selector, text) {
  return page.evaluate((sel, txt) => {
    const elements = Array.from(document.querySelectorAll(sel));
    const target = elements.find((el) => el.textContent && el.textContent.includes(txt));
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, selector, text);
}

async function runAudit() {
  console.log('Launching Chrome for comprehensive visual audit...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await sleep(1500); // Allow synthetic wafer and mini thumbnails to generate

  // 1. Initial State: Cleanroom layout, mini defect thumbnails, all annotations visible
  console.log('1. Capturing Initial State with mini-thumbnails and full annotations...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_01_initial_cleanroom.png') });

  // 2. Otsu Automated Thresholding Filter
  console.log('2. Testing Otsu Automated Binarization filter...');
  await clickByText(page, 'button', 'Otsu Bin');
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_02_filter_otsu.png') });

  // 3. Sobel Edge Filter
  console.log('3. Testing Sobel Edge Detection filter...');
  await clickByText(page, 'button', 'Sobel');
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_03_filter_sobel.png') });

  // 4. Reset Filters
  console.log('4. Testing Reset Image Filters...');
  await clickByText(page, 'button', 'Reset Image Filters');
  await sleep(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_04_filters_reset.png') });

  // 5. Switching to Demo Sample: CMP Mechanical Micro-Scratch
  console.log('5. Testing Demo Sample: CMP Mechanical Micro-Scratch...');
  await clickByText(page, 'button', 'Demo Samples');
  await sleep(300);
  await clickByText(page, 'li, [role="menuitem"]', 'CMP Mechanical Micro-Scratch');
  await sleep(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_05_cmp_scratch_sample.png') });

  // 6. Switching to Demo Sample: Photolithography Pattern Bridge
  console.log('6. Testing Demo Sample: Photolithography Pattern Bridge (2048x2048)...');
  await clickByText(page, 'button', 'Demo Samples');
  await sleep(300);
  await clickByText(page, 'li, [role="menuitem"]', 'Photolithography Pattern Bridge');
  await sleep(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_06_litho_bridge_sample.png') });

  // 7. Clicking Defect Thumbnail Card in the Strip for Fly-to inspection
  console.log('7. Testing Defect Thumbnail Card click -> Fly-To...');
  await page.click('[data-testid="defect-card"]');
  await sleep(700); // 300ms animation + settling
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_07_card_fly_to.png') });

  // 8. Draw Bounding Box (B)
  console.log('8. Testing Bounding Box Drawing...');
  await page.keyboard.press('b');
  await sleep(200);
  await page.mouse.move(500, 300);
  await page.mouse.down();
  await page.mouse.move(620, 420, { steps: 8 });
  await page.mouse.up();
  await sleep(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_08_new_bbox.png') });

  // 9. Draw Polygon (P)
  console.log('9. Testing Polygon Drawing...');
  await page.keyboard.press('p');
  await sleep(200);
  const pts = [
    { x: 720, y: 250 },
    { x: 810, y: 240 },
    { x: 840, y: 320 },
    { x: 750, y: 350 },
  ];
  for (const p of pts) {
    await page.mouse.click(p.x, p.y);
    await sleep(150);
  }
  await page.keyboard.press('Enter');
  await sleep(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_09_new_polygon.png') });

  // 10. Open Export Dialog
  console.log('10. Testing Export Modal...');
  await clickByText(page, 'button', 'Export Annotations');
  await sleep(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_10_export_modal.png') });

  console.log('Audit completed successfully! Closing browser.');
  await browser.close();
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
