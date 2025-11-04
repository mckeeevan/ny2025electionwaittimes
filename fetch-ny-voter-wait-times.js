import fs from "fs";

// Convert current time to Eastern (New York) date
function getEasternDate() {
  const now = new Date();
  const options = { timeZone: "America/New_York", hour12: false };
  const formatter = new Intl.DateTimeFormat("en-CA", {
    ...options,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  const parts = formatter.formatToParts(now);
  const get = type => parts.find(p => p.type === type)?.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    datetime: `${get("year")}-${get("month")}-${get("day")}_${get("hour")}-${get("minute")}`
  };
}

async function fetchAllFeatures() {
  const urlBase = "https://services6.arcgis.com/yG5s3afENB5iO9fj/arcgis/rest/services/NYVoterWaitTime_Public_View/FeatureServer/0/query";
  const pageSize = 2000;
  let resultOffset = 0;
  let allFeatures = [];

  while (true) {
    const url = `${urlBase}?where=1=1&outFields=*&f=json&resultOffset=${resultOffset}&resultRecordCount=${pageSize}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const attributesArray = data.features.map(f => f.attributes);
    allFeatures = allFeatures.concat(attributesArray);
    if (data.features.length < pageSize) break;
    resultOffset += pageSize;
  }

  return allFeatures;
}

const { date: todayET, datetime: fileTimestamp } = getEasternDate();

// 🛑 Automatically stop after midnight NYC time
const cutoff = "2025-11-04"; // today's date (Election Day, for example)
if (todayET > cutoff) {
  console.log(`🛑 It's after ${cutoff} in New York time (${todayET}), stopping.`);
  process.exit(0);
}

fetchAllFeatures()
  .then(data => {
    fs.mkdirSync("data", { recursive: true });
    const filePath = `data/ny-voter-wait-times-${fileTimestamp}.json`;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved ${data.length} records to ${filePath} (NYC time)`);
  })
  .catch(err => {
    console.error("❌ Error fetching data:", err);
    process.exit(1);
  });
