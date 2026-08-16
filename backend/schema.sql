-- StoreStars - database schema

DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(60)  NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  address    VARCHAR(400) NOT NULL,
  role       VARCHAR(10)  NOT NULL CHECK (role IN ('ADMIN', 'USER', 'OWNER')),
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  -- SHA-256 of the password reset token, never the token itself.
  reset_token         VARCHAR(64),
  reset_token_expires TIMESTAMP
);

CREATE TABLE stores (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(60)  NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  address    VARCHAR(400) NOT NULL,
  owner_id   INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE ratings (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER   NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  store_id   INTEGER   NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rating     INTEGER   NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, store_id)
);

CREATE INDEX idx_stores_owner ON stores(owner_id);
CREATE INDEX idx_ratings_store ON ratings(store_id);
