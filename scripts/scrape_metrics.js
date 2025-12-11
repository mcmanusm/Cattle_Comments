const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const url = "https://mcmanusm.github.io/Cattle_Comments/";

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for Power BI iframe
    await page.waitForSelector("#pbiFrame");
    const frameHandle = await page.$("#pbiFrame");
    const frame = await frameHandle.contentFrame();

    // Wait for Power BI to finish rendering
    await new Promise(r => setTimeout(r, 6000));

    // Extract accessibility tree
    const accTree = await frame.accessibility.snapshot();

    // Flatten A11Y tree to a simple text array
    function walk(node, list = []) {
        if (!node) return list;
        if (node.name) list.push(node.name.trim());
        if (node.children) {
            for (const child of node.children) walk(child, list);
        }
        return list;
    }

    const flat = walk(accTree);

    // Helper – find label, then value that comes right after it
    function findValue(label, weekIndex) {
        // Find label in flattened list (partial match allowed)
        const idx = flat.findIndex(t => t.toLowerCase().includes(label.toLowerCase()));
        if (idx === -1) return null;

        // Each week block appears in sequence, so:
        // Week 0 = index
        // Week 1 = index + 2
        // Week 2 = index + 4
        // Week 3 = index + 6
        const valueIndex = idx + 1 + (weekIndex * 2);
        const raw = flat[valueIndex];
        if (!raw) return null;

        return raw;
    }

    // Clean numeric values
    function clean(val) {
        if (!val) return null;
        return val.replace(/[^\d.-]/g, "");
    }

    const metrics = {
        this_week: {
            total_head: clean(findValue("Total Head Incl Reoffers", 0)),
            clearance_rate: clean(findValue("Clearance Rate", 0)),
            vor: clean(findValue("Amount Over Reserve", 0)),
            ayci: clean(findValue("AYCI", 0)),
        },
        last_week: {
            total_head: clean(findValue("Total Head Incl Reoffers", 1)),
            clearance_rate: clean(findValue("Clearance Rate", 1)),
            vor: clean(findValue("Amount Over Reserve", 1)),
            ayci: clean(findValue("AYCI", 1)),
        },
        two_weeks_ago: {
            total_head: clean(findValue("Total Head Incl Reoffers", 2)),
            clearance_rate: clean(findValue("Clearance Rate", 2)),
            vor: clean(findValue("Amount Over Reserve", 2)),
            ayci: clean(findValue("AYCI", 2)),
        },
        three_weeks_ago: {
            total_head: clean(findValue("Total Head Incl Reoffers", 3)),
            clearance_rate: clean(findValue("Clearance Rate", 3)),
            vor: clean(findValue("Amount Over Reserve", 3)),
            ayci: clean(findValue("AYCI", 3)),
        }
    };

    console.log("SCRAPED METRICS:", metrics);

    // Save JSON file
    fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));

    await browser.close();
})();
