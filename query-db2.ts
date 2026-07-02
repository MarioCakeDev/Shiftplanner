const { Database } = require("bun:sqlite");
const db = new Database("data/schichtplan.db");

// Test the exact query the API would run
const month = "2026-07";
const [year, mon] = month.split("-").map(Number);
const endDate = new Date(year, mon, 0).getDate();
const startBound = `${month}-01`;
const endBound = `${month}-${String(endDate).padStart(2, "0")}T23:59:59`;

console.log("start:", startBound);
console.log("end:", endBound);

const rows = db.query(`
  SELECT * FROM shifts 
  WHERE user_id = ?1 
    AND start_date_time >= ?2 
    AND start_date_time <= ?3
`).all("dev-user", startBound, endBound);

console.log("Result count:", rows.length);
if (rows.length > 0) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  // Also check what the values look like
  const all = db.query("SELECT start_date_time FROM shifts").all();
  console.log("All start times:", JSON.stringify(all));
}
