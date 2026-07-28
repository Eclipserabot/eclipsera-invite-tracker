const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, 'invites.db'));

function initDB() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS invites (
        userId TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function addInvite(userId) {
  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO invites (userId, count) VALUES (?, 1)
            ON CONFLICT(userId) DO UPDATE SET count = count + 1`,
      [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
  });
}

function getInvites(userId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT count FROM invites WHERE userId =?`, [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row? row.count : 0);
    });
  });
}

module.exports = { initDB, addInvite, getInvites };
