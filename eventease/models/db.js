const Database = require('better-sqlite3');
const db = new Database('eventease.db');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    date TEXT,
    time TEXT,
    total_seats INTEGER NOT NULL,
    price REAL,
    image TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    seat_number INTEGER NOT NULL,
    entry_code TEXT UNIQUE,
    event_id INTEGER,
    FOREIGN KEY (event_id) REFERENCES events(id)
  );
`);

module.exports = db;
