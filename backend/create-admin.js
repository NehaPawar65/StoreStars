// Creates the first ADMIN from the ADMIN_* values in .env:  npm run create-admin
// Needed because public signup only creates USER accounts, so without this nobody
// could log in to add stores and owners. Safe to run twice.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("./db");

const NAME = process.env.ADMIN_NAME;
const EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD;
const ADDRESS = process.env.ADMIN_ADDRESS;

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkEnv() {
  if (!NAME || !EMAIL || !PASSWORD || !ADDRESS) {
    return "ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_ADDRESS must all be set in backend/.env";
  }
  if (NAME.trim().length > 60) return "ADMIN_NAME must be at most 60 characters";
  if (!EMAIL_RE.test(EMAIL)) return "ADMIN_EMAIL is not a valid email address";
  if (ADDRESS.length > 400) return "ADMIN_ADDRESS must be at most 400 characters";
  if (!PASSWORD_RE.test(PASSWORD)) {
    return "ADMIN_PASSWORD must be 8-16 characters and include one uppercase letter and one special character";
  }
  return null;
}

async function createAdmin() {
  const problem = checkEnv();
  if (problem) throw new Error(problem);

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [EMAIL]);
  if (existing.rows.length) {
    console.log(`An account with the email ${EMAIL} already exists - nothing was changed.`);
    return;
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  await pool.query(
    "INSERT INTO users (name, email, password, address, role) VALUES ($1, $2, $3, $4, 'ADMIN')",
    [NAME.trim(), EMAIL, hash, ADDRESS.trim()]
  );

  console.log("\nAdmin account created. Log in with:");
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log("\n(The password is stored bcrypt-hashed, never as plain text.)");
  console.log("Use the admin dashboard to add your own users and stores.\n");
}

createAdmin()
  .catch((err) => {
    console.error("Could not create the admin:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
