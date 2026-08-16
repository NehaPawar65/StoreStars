require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./db");

async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);

  const counts = await pool.query(`
    SELECT (SELECT COUNT(*) FROM users)::int   AS users,
           (SELECT COUNT(*) FROM stores)::int  AS stores,
           (SELECT COUNT(*) FROM ratings)::int AS ratings
  `);

  console.log("Tables created: users, stores, ratings");
  console.log("Rows now in the database:", counts.rows[0]);
  console.log("\nNext step: npm run create-admin");
}

initDb()
  .catch((err) => {
    console.error("Could not create the tables:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
