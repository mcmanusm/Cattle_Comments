// ============================================================
// scrape_metrics.js
// ============================================================
// PURPOSE:
// Scrape Power BI table embedded in table.html and update metrics.json
// This version is HARDENED for headless Power BI rendering.
// ============================================================

const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {
  const url = "https://mcmanusm.github.io/Cattle_Comments/table.html";
  const outputFile = "metrics.json";

  // ------------------------------------------------------------
  // LOAD PREVIOUS METRICS (FOR CHANGE DETECTION)
  // ------------------------------------------------------------
  let previousMetrics = null;

  if (fs.existsSync(outputFile)) {
    previousMetrics = JSON.parse(fs.readFileSync(outputFile, "utf8"));
    console.log("Loaded previous metrics for comparison");
  } else {
    console.log("No previous metrics found — first write");
  }

  // ------------------------------------------------------------
  // LAUNCH BROWSER (POWER BI SAFE CONFIG)
  // ------------------------------------------------------------
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  await page.setViewport({ width: 1920, height: 1080 });

  console.log("Navigating to page...");
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  // ------------------------------------------------------------
  // WAIT FOR POWER BI IFRAME
  // ------------------------------------------------------------
  console.log("Waiting for Power BI iframe...");
  await page.waitForSelector("#pbiTable", { timeout: 30000 });

  const frameHandle = await page.$("#pbiTable");
  const frame = await frameHandle.contentFrame();

  if (!frame) {
    console.error("❌ Failed to access Power BI iframe");
    await browser.close();
    process.exit(1);
  }

  // ------------------------------------------------------------
  // FORCE POWER BI TABLE TO RENDER
  // ------------------------------------------------------------
  console.log("Waiting for Power BI content to fully render...");

  await frame.waitForFunction(() => {
    return (
      document.body &&
      document.body.innerText &&
      document.body.innerText.length > 300
    );
  }, { timeout: 45000 });

  // Extra safety delay
  await new Promise((r) => setTimeout(r, 8000));

  // ------------------------------------------------------------
  // SCRAPE VISIBLE TEXT
  // ------------------------------------------------------------
  const allText = await frame.evaluate(() => document.body.innerText);

  console.log("=== RAW SCRAPE START ===");
  console.log(allText);
  console.log("=== RAW SCRAPE END ===");

  // ------------------------------------------------------------
  // NORMALISE TEXT INTO LINES
  // ------------------------------------------------------------
  const lines = allText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // ------------------------------------------------------------
  // PARSE TABLE ROWS
  // ------------------------------------------------------------
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "Select Row") {
      const block = lines.slice(i, i + 11);

      const row = {
        index: block[1],
        total_head: block[2].replace(/[^\d-]/g, ""),
        clearance_rate: block[3].replace(/[^\d-]/g, ""),
        amount_over_reserve: block[4].replace(/[^\d-]/g, ""),
        ayci_dw: block[5].replace(/[^\d-]/g, ""),
        ayci_change: block[6].replace(/[^\d-]/g, ""),
        total_head_change: block[7].replace(/[^\d-]/g, ""),
        clearance_rate_change: block[8].replace(/[^\d-]/g, ""),
        vor_change: block[9].replace(/[^\d-]/g, ""),
      };

      rows.push(row);
    }
  }

  // ------------------------------------------------------------
  // VALIDATION
  // ------------------------------------------------------------
  if (rows.length !== 4) {
    console.error("❌ Expected 4 rows but found:", rows.length);
    console.error(rows);
    await browser.close();
    process.exit(1);
  }

  // ------------------------------------------------------------
  // BUILD METRICS OBJECT
  // ------------------------------------------------------------
  const metrics = {
    updated_at: new Date().toISOString(),
    this_week: rows[0],
    last_week: rows[1],
    two_weeks_ago: rows[2],
    three_weeks_ago: rows[3],
  };

  console.log("SCRAPED METRICS:", metrics);

  // ------------------------------------------------------------
  // CHANGE DETECTION
  // ------------------------------------------------------------
  if (
    previousMetrics &&
    JSON.stringify(previousMetrics) === JSON.stringify(metrics)
  ) {
    console.log("No metric changes detected — skipping write");
    await browser.close();
    return;
  }

  // ------------------------------------------------------------
  // WRITE OUTPUT
  // ------------------------------------------------------------
  fs.writeFileSync(outputFile, JSON.stringify(metrics, null, 2));
  console.log("metrics.json updated");

  await browser.close();
  console.log("Scrape completed successfully");
})();
