const fs = require("fs");
const puppeteer = require("puppeteer");

(async () => {
  const url = "https://mcmanusm.github.io/Cattle_Comments/";

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  // Wait for iframe
  await page.waitForSelector("#pbiFrame");
  const frameHandle = await page.$("#pbiFrame");
  const frame = await frameHandle.contentFrame();

  // Let visuals load
  await new Promise(r => setTimeout(r, 6000));

  // helper to extract a text value from a visual group
  async function getMetric(viewLabel, metricLabel) {
    return await frame.evaluate((viewLabel, metricLabel) => {
      const groups = [...document.querySelectorAll(".visual-title")];
      const viewGroup = groups.find(g => g.textContent.includes(viewLabel));
      if (!viewGroup) return null;

      const parent = viewGroup.closest(".visual-container-body");
      if (!parent) return null;

      const metricElement = [...parent.querySelectorAll("*")].find(el =>
        el.innerText && el.innerText.includes(metricLabel)
      );

      if (!metricElement) return null;

      // Extract number
      const cleaned = metricElement.innerText.replace(/[^0-9.-]/g, "");
      return Number(cleaned);
    }, viewLabel, metricLabel);
  }

  // Views
  const VIEWS = {
    this_week: "This Week",
    last_week: "Last Week",
    two_weeks_ago: "2 Weeks Ago",
    three_weeks_ago: "3 Weeks Ago"
  };

  // Metrics to extract
  const METRICS = {
    total_head: "Total Head Incl Reoffers",
    clearance_rate: "Clearance Rate",
    vor: "Amount Over Reserve",
    ayci: "AYCI c/kg DW",
    // Change metrics (only in this week view)
    total_head_change: "Total Head Change Index",
    clearance_change: "Clearance Change Index",
    vor_change: "Amount Over Reserve Change Index",
    ayci_change: "AYCI Change Index"
  };

  const result = {
    this_week: {},
    last_week: {},
    two_weeks_ago: {},
    three_weeks_ago: {}
  };

  // ─── EXTRACT METRICS FOR EACH VIEW ───────────────────────────
  for (const [viewKey, viewLabel] of Object.entries(VIEWS)) {
    for (const [metricKey, metricLabel] of Object.entries(METRICS)) {

      // Only this_week has change metrics
      if (metricKey.includes("change") && viewKey !== "this_week") continue;

      const value = await getMetric(viewLabel, metricLabel);
      result[viewKey][metricKey] = value ?? null;
    }
  }

  // Save JSON
  fs.writeFileSync("metrics.json", JSON.stringify(result, null, 2));

  await browser.close();
})();
