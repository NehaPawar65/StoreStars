require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("./db");
const { auth, allow } = require("./middleware");

const app = express();
app.use(cors());
app.use(express.json());

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;

// Returns an error message, or null when valid. Password is only checked when
// provided, so stores (which have none) can reuse this.
function validate({ name, email, address, password }) {
  if (!name || !name.trim() || name.trim().length > 60) {
    return "Name is required and must be at most 60 characters";
  }
  if (!email || !EMAIL_RE.test(email.trim())) {
    return "Please enter a valid email address";
  }
  if (!address || !address.trim() || address.length > 400) {
    return "Address is required and must be at most 400 characters";
  }
  if (password !== undefined && !PASSWORD_RE.test(password)) {
    return "Password must be 8-16 characters and include one uppercase letter and one special character";
  }
  return null;
}

// Wraps an async route so we never forget a try/catch.
const run = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  });

// "%text%" for ILIKE, or "%" when the filter is empty.
const like = (value) => `%${(value || "").trim()}%`;

// Column names cannot be passed as $1 parameters, so they are whitelisted here.
// Anything unknown falls back to the default column.
function orderBy(sort, order, allowed, fallback) {
  const column = allowed.includes(sort) ? sort : fallback;
  const direction = String(order).toLowerCase() === "desc" ? "DESC" : "ASC";
  return `ORDER BY ${column} ${direction} NULLS LAST`;
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, address: u.address, role: u.role });

// Only the SHA-256 of a reset token is stored, so a copy of the database is not
// enough to reset anybody's password.
const RESET_MINUTES = 15;
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/* ------------------------------------------------------------------ */
/* auth                                                                */
/* ------------------------------------------------------------------ */

// Public signup - always creates a normal USER.
app.post(
  "/api/auth/signup",
  run(async (req, res) => {
    const { name, email, address, password } = req.body;
    const error = validate({ name, email, address, password });
    if (error) return res.status(400).json({ message: error });

    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email.trim().toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ message: "Email is already registered" });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, address, role)
       VALUES ($1, $2, $3, $4, 'USER')
       RETURNING id, name, email, address, role`,
      [name.trim(), email.trim().toLowerCase(), hash, address.trim()]
    );
    res.status(201).json({ message: "Signup successful, please log in", data: result.rows[0] });
  })
);

app.post(
  "/api/auth/login",
  run(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [String(email).trim().toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({ message: "Login successful", data: { token, user: publicUser(user) } });
  })
);

// No mail service is configured, so the link is printed to the backend terminal.
// It is deliberately NOT returned in the response, or anyone could type someone
// else's email and take over the account. To email it, replace the console.log block.
app.post(
  "/api/auth/forgot-password",
  run(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });

    const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);

    if (result.rows.length) {
      const token = crypto.randomBytes(32).toString("hex");
      await pool.query(
        `UPDATE users
            SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '${RESET_MINUTES} minutes'
          WHERE id = $2`,
        [hashToken(token), result.rows[0].id]
      );

      const link = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;
      console.log("\n=========== PASSWORD RESET LINK ===========");
      console.log(`For:     ${email}`);
      console.log(`Link:    ${link}`);
      console.log(`Expires: in ${RESET_MINUTES} minutes`);
      console.log("===========================================\n");
    }

    // Identical reply either way, so this cannot reveal which emails are registered.
    res.json({
      message: "If that email is registered, a reset link has been created. Check the backend terminal for it.",
      data: {},
    });
  })
);

app.post(
  "/api/auth/reset-password",
  run(async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token) return res.status(400).json({ message: "This reset link is missing its token" });
    if (!PASSWORD_RE.test(newPassword || "")) {
      return res.status(400).json({
        message: "Password must be 8-16 characters and include one uppercase letter and one special character",
      });
    }

    const result = await pool.query(
      "SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()",
      [hashToken(token)]
    );
    if (!result.rows.length) return res.status(400).json({ message: "This reset link is invalid or has expired" });

    // Clearing the token makes the link single use.
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
      [hash, result.rows[0].id]
    );
    res.json({ message: "Password reset successfully, you can now log in", data: {} });
  })
);

app.put(
  "/api/auth/password",
  auth,
  run(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (!PASSWORD_RE.test(newPassword)) {
      return res.status(400).json({
        message: "Password must be 8-16 characters and include one uppercase letter and one special character",
      });
    }

    const result = await pool.query("SELECT password FROM users WHERE id = $1", [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hash, req.user.id]);
    res.json({ message: "Password updated successfully", data: {} });
  })
);

/* ------------------------------------------------------------------ */
/* admin                                                               */
/* ------------------------------------------------------------------ */

app.get(
  "/api/admin/stats",
  auth,
  allow("ADMIN"),
  run(async (req, res) => {
    const result = await pool.query(`
      SELECT (SELECT COUNT(*) FROM users)::int   AS users,
             (SELECT COUNT(*) FROM stores)::int  AS stores,
             (SELECT COUNT(*) FROM ratings)::int AS ratings
    `);
    res.json({ message: "Success", data: result.rows[0] });
  })
);

// The "rating" column is the average rating of an OWNER's store(s), NULL for everyone else.
app.get(
  "/api/admin/users",
  auth,
  allow("ADMIN"),
  run(async (req, res) => {
    const { name, email, address, role, sort, order } = req.query;
    if (role && !["ADMIN", "USER", "OWNER"].includes(role)) {
      return res.status(400).json({ message: "Invalid role filter" });
    }

    const sql = `
      SELECT u.id, u.name, u.email, u.address, u.role,
             (SELECT ROUND(AVG(r.rating), 1)::float
                FROM stores s JOIN ratings r ON r.store_id = s.id
               WHERE s.owner_id = u.id) AS rating
        FROM users u
       WHERE u.name ILIKE $1
         AND u.email ILIKE $2
         AND u.address ILIKE $3
         AND ($4 = '' OR u.role = $4)
       ${orderBy(sort, order, ["name", "email", "address", "role", "rating"], "name")}
    `;
    const result = await pool.query(sql, [like(name), like(email), like(address), role || ""]);
    res.json({ message: "Success", data: result.rows });
  })
);

app.get(
  "/api/admin/users/:id",
  auth,
  allow("ADMIN"),
  run(async (req, res) => {
    const result = await pool.query("SELECT id, name, email, address, role FROM users WHERE id = $1", [req.params.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    let stores = [];
    if (user.role === "OWNER") {
      const storeResult = await pool.query(
        `SELECT s.id, s.name, s.email, s.address,
                COALESCE(ROUND(AVG(r.rating), 1), 0)::float AS rating,
                COUNT(r.id)::int AS total_ratings
           FROM stores s LEFT JOIN ratings r ON r.store_id = s.id
          WHERE s.owner_id = $1
          GROUP BY s.id
          ORDER BY s.name`,
        [user.id]
      );
      stores = storeResult.rows;
    }
    res.json({ message: "Success", data: { ...user, stores } });
  })
);

app.post(
  "/api/admin/users",
  auth,
  allow("ADMIN"),
  run(async (req, res) => {
    const { name, email, address, password, role } = req.body;
    const error = validate({ name, email, address, password });
    if (error) return res.status(400).json({ message: error });
    if (!["ADMIN", "USER", "OWNER"].includes(role)) {
      return res.status(400).json({ message: "Role must be ADMIN, USER or OWNER" });
    }

    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email.trim().toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ message: "Email is already registered" });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, address, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, address, role`,
      [name.trim(), email.trim().toLowerCase(), hash, address.trim(), role]
    );
    res.status(201).json({ message: "User created successfully", data: result.rows[0] });
  })
);

// LEFT JOIN so stores with no ratings still appear, with a rating of 0.
app.get(
  "/api/admin/stores",
  auth,
  allow("ADMIN"),
  run(async (req, res) => {
    const { name, email, address, sort, order } = req.query;
    const sql = `
      SELECT s.id, s.name, s.email, s.address,
             o.name AS owner_name,
             COALESCE(ROUND(AVG(r.rating), 1), 0)::float AS rating,
             COUNT(r.id)::int AS total_ratings
        FROM stores s
        LEFT JOIN users o   ON o.id = s.owner_id
        LEFT JOIN ratings r ON r.store_id = s.id
       WHERE s.name ILIKE $1
         AND s.email ILIKE $2
         AND s.address ILIKE $3
       GROUP BY s.id, o.name
       ${orderBy(sort, order, ["name", "email", "address", "owner_name", "rating"], "name")}
    `;
    const result = await pool.query(sql, [like(name), like(email), like(address)]);
    res.json({ message: "Success", data: result.rows });
  })
);

app.post(
  "/api/admin/stores",
  auth,
  allow("ADMIN"),
  run(async (req, res) => {
    const { name, email, address, owner_id } = req.body;
    const error = validate({ name, email, address });
    if (error) return res.status(400).json({ message: error });

    const owner = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'OWNER'", [owner_id || 0]);
    if (!owner.rows.length) return res.status(400).json({ message: "Please choose a valid store owner" });

    const exists = await pool.query("SELECT id FROM stores WHERE email = $1", [email.trim().toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ message: "A store with this email already exists" });

    const result = await pool.query(
      `INSERT INTO stores (name, email, address, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, address, owner_id`,
      [name.trim(), email.trim().toLowerCase(), address.trim(), owner_id]
    );
    res.status(201).json({ message: "Store created successfully", data: result.rows[0] });
  })
);

/* ------------------------------------------------------------------ */
/* stores (normal user)                                                */
/* ------------------------------------------------------------------ */

// The MAX(CASE ...) columns pull this user's own rating out of the aggregate,
// so one query returns both the public average and their personal rating.
app.get(
  "/api/stores",
  auth,
  allow("USER"),
  run(async (req, res) => {
    const { name, address } = req.query;
    const result = await pool.query(
      `SELECT s.id, s.name, s.address,
              COALESCE(ROUND(AVG(r.rating), 1), 0)::float AS overall_rating,
              COUNT(r.id)::int AS total_ratings,
              MAX(CASE WHEN r.user_id = $1 THEN r.rating END)  AS my_rating,
              MAX(CASE WHEN r.user_id = $1 THEN r.id END)      AS my_rating_id,
              MAX(CASE WHEN r.user_id = $1 THEN r.comment END) AS my_comment
         FROM stores s
         LEFT JOIN ratings r ON r.store_id = s.id
        WHERE s.name ILIKE $2
          AND s.address ILIKE $3
        GROUP BY s.id
        ORDER BY s.name ASC`,
      [req.user.id, like(name), like(address)]
    );
    res.json({ message: "Success", data: result.rows });
  })
);

/* ------------------------------------------------------------------ */
/* ratings                                                             */
/* ------------------------------------------------------------------ */

const validRating = (value) => Number.isInteger(value) && value >= 1 && value <= 5;

// The message is optional. Blank or missing is stored as NULL rather than "".
const MAX_COMMENT = 500;
function cleanComment(value) {
  if (value === undefined || value === null) return { comment: null, error: null };
  const text = String(value).trim();
  if (text.length > MAX_COMMENT) return { comment: null, error: `Your message must be at most ${MAX_COMMENT} characters` };
  return { comment: text === "" ? null : text, error: null };
}

app.post(
  "/api/ratings",
  auth,
  allow("USER"),
  run(async (req, res) => {
    const store_id = Number(req.body.store_id);
    const rating = Number(req.body.rating);
    if (!validRating(rating)) return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });

    const { comment, error } = cleanComment(req.body.comment);
    if (error) return res.status(400).json({ message: error });

    const store = await pool.query("SELECT id FROM stores WHERE id = $1", [store_id || 0]);
    if (!store.rows.length) return res.status(404).json({ message: "Store not found" });

    const existing = await pool.query("SELECT id FROM ratings WHERE user_id = $1 AND store_id = $2", [
      req.user.id,
      store_id,
    ]);
    if (existing.rows.length) {
      return res.status(409).json({ message: "You have already rated this store, please update it instead" });
    }

    const result = await pool.query(
      `INSERT INTO ratings (user_id, store_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, store_id, rating, comment`,
      [req.user.id, store_id, rating, comment]
    );
    res.status(201).json({ message: "Rating submitted", data: result.rows[0] });
  })
);

app.put(
  "/api/ratings/:id",
  auth,
  allow("USER"),
  run(async (req, res) => {
    const rating = Number(req.body.rating);
    if (!validRating(rating)) return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });

    const { comment, error } = cleanComment(req.body.comment);
    if (error) return res.status(400).json({ message: error });

    // The user_id check makes sure nobody can edit somebody else's rating.
    const result = await pool.query(
      `UPDATE ratings SET rating = $1, comment = $2, updated_at = NOW()
        WHERE id = $3 AND user_id = $4
        RETURNING id, store_id, rating, comment`,
      [rating, comment, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Rating not found" });
    res.json({ message: "Rating updated", data: result.rows[0] });
  })
);

/* ------------------------------------------------------------------ */
/* owner                                                               */
/* ------------------------------------------------------------------ */

app.get(
  "/api/owner/dashboard",
  auth,
  allow("OWNER"),
  run(async (req, res) => {
    const stores = await pool.query(
      `SELECT s.id, s.name, s.email, s.address,
              COALESCE(ROUND(AVG(r.rating), 1), 0)::float AS average_rating,
              COUNT(r.id)::int AS total_ratings
         FROM stores s LEFT JOIN ratings r ON r.store_id = s.id
        WHERE s.owner_id = $1
        GROUP BY s.id
        ORDER BY s.name`,
      [req.user.id]
    );

    const raters = await pool.query(
      `SELECT s.id AS store_id, u.name, u.email, r.rating, r.comment, r.updated_at
         FROM ratings r
         JOIN users u  ON u.id = r.user_id
         JOIN stores s ON s.id = r.store_id
        WHERE s.owner_id = $1
        ORDER BY u.name`,
      [req.user.id]
    );

    const data = stores.rows.map((store) => ({
      ...store,
      raters: raters.rows.filter((rater) => rater.store_id === store.id),
    }));
    res.json({ message: "Success", data });
  })
);

/* ------------------------------------------------------------------ */

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
