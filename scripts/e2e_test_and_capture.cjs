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
      (target).click();
      return true;
    }
    return false;
  }, selector, text);
}

async function run() {
  console.log('Launching Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await sleep(1200); // Allow synthetic wafer canvas generation to complete

  // 1. Initial State
  console.log('1. Capturing Initial State...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_initial_overview.png') });

  // 2. Mouse-centric Zoom
  console.log('2. Testing Zoom via Wheel...');
  await page.mouse.move(700, 450);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel({ deltaY: -100 });
    await sleep(50);
  }
  await sleep(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_zoomed_view.png') });

  // Reset zoom with Fit (1 key)
  await page.keyboard.press('1');
  await sleep(300);

  // 3. Draw Bounding Box (B key or toolbar)
  console.log('3. Testing Bounding Box Creation...');
  await page.keyboard.press('b');
  await sleep(200);

  // Drag on canvas from (550, 280) to (680, 390)
  await page.mouse.move(550, 280);
  await page.mouse.down();
  await page.mouse.move(680, 390, { steps: 10 });
  await page.mouse.up();
  await sleep(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_bounding_box_created.png') });

  // 4. Draw Polygon (P key)
  console.log('4. Testing Polygon Tool...');
  await page.keyboard.press('p');
  await sleep(200);

  const polyPoints = [
    { x: 740, y: 220 },
    { x: 820, y: 210 },
    { x: 860, y: 280 },
    { x: 800, y: 330 },
    { x: 730, y: 290 },
  ];

  for (const pt of polyPoints) {
    await page.mouse.click(pt.x, pt.y);
    await sleep(150);
  }
  // Press Enter to close polygon
  await page.keyboard.press('Enter');
  await sleep(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_polygon_created.png') });

  // 5. Defect Taxonomy change
  console.log('5. Testing Defect Taxonomy switch...');
  await clickByText(page, 'p, span, div', 'Via Void');
  await sleep(200);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_taxonomy_selection.png') });

  // 6. Test Web Worker Filter: Sobel
  console.log('6. Testing Worker Filter: Sobel Edge...');
  await clickByText(page, 'button', 'Sobel');
  await sleep(600); // Wait for Web Worker to compute and update canvas
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_worker_filter_sobel.png') });

  // 7. Test Web Worker Filter: Hist Eq
  console.log('7. Testing Worker Filter: Histogram Equalization...');
  await clickByText(page, 'button', 'Hist Eq');
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_worker_filter_hist_eq.png') });

  // 8. Test Web Worker Filter: Invert SEM
  console.log('8. Testing Worker Filter: Invert SEM...');
  await clickByText(page, 'button', 'Invert SEM');
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_worker_filter_invert.png') });

  // Reset to Normal
  await clickByText(page, 'button', 'Normal');
  await sleep(300);

  // 9. Test Defect Gallery Fly-To Animation
  console.log('9. Testing Defect Strip Fly-To...');
  await page.evaluate(() => {
    const bottomCards = Array.from(document.querySelectorAll('div')).filter(
      (el) => el.textContent && el.textContent.includes('Via Void') && el.textContent.includes('#')
    );
    if (bottomCards.length > 0) {
      bottomCards[0].click();
    }
  });
  await sleep(500); // 300ms lerp animation
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_defect_fly_to.png') });

  // 10. Test Export Dialog
  console.log('10. Testing Export Modal...');
  await clickByText(page, 'button', 'Export Annotations');
  await sleep(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_export_coco_dialog.png') });

  // Switch to YOLO TXT tab
  console.log('Switching to YOLO tab...');
  await clickByText(page, 'button, [role="tab"]', 'YOLO TXT');
  await sleep(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_export_yolo_tab.png') });

  // Close Export Dialog
  await clickByText(page, 'button', 'Close');
  await sleep(300);

  // 11. Test Hotkey Cheat Sheet
  console.log('11. Testing Hotkey Modal...');
  await page.click('button[aria-label="shortcuts-button"]');
  await sleep(400);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_hotkey_modal.png') });

  console.log('All tests and screenshots completed successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Error running E2E test:', err);
  process.exit(1);
});
