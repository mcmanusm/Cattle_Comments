const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// URL of your Power BI iframe
const IFRAME_URL = "https://app.powerbi.com/view?r=XXXXXX"; // <-- your iframe URL here

async function run() {
    try {
        const { data: html } = await axios.get(IFRAME_URL);
        const $ = cheerio.load(html);

        // Helper: get metric value by matching label text
        function getMetric(labelText) {
            const label = $(`h4[data-sub-selection-object-name*="${labelText}"]`);
            if (!label.length) return null;

            const valueElem = label.parent().find("p");
            if (!valueElem.length) return null;

            return valueElem.text().trim();
        }

        // Extract values from each week's tile group
        const metrics = {
            this_week: {
                total_head: getMetric("Total Head"),
                clearance_rate: getMetric("Clearance Rate"),
                vor: getMetric("Amount over Reserve"),
                ayci: getMetric("AYCI")
            },
            last_week: {
                total_head: getMetric("Total Head", 1),
                clearance_rate: getMetric("Clearance Rate", 1),
                vor: getMetric("Amount over Reserve", 1),
                ayci: getMetric("AYCI", 1)
            },
            two_weeks_ago: {
                total_head: getMetric("Total Head", 2),
                clearance_rate: getMetric("Clearance Rate", 2),
                vor: getMetric("Amount over Reserve", 2),
                ayci: getMetric("AYCI", 2)
            },
            three_weeks_ago: {
                total_head: getMetric("Total Head", 3),
                clearance_rate: getMetric("Clearance Rate", 3),
                vor: getMetric("Amount over Reserve", 3),
                ayci: getMetric("AYCI", 3)
            }
        };

        // Write JSON file
        fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));
        console.log("Updated metrics.json:\n", metrics);

    } catch (err) {
        console.error("Scrape error:", err);
        process.exit(1);
    }
}

run();
