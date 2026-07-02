const { Database } = require("bun:sqlite");
const db = new Database("data/schichtplan.db");
const rows = db.query("SELECT * FROM shifts").all();
console.log("Shifts count:", rows.length);
console.log(JSON.stringify(rows, null, 2));

const templates = db.query("SELECT * FROM shift_templates").all();
console.log("Templates:", JSON.stringify(templates, null, 2));
