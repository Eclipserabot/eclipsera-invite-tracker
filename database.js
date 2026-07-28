const Database = require("better-sqlite3");
const fs = require("fs");

if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
}

const db = new Database("./data/invites.db");

db.exec(`
CREATE TABLE IF NOT EXISTS invites (
    inviteeId TEXT PRIMARY KEY,
    inviterId TEXT NOT NULL,
    guildId TEXT NOT NULL,
    verified INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
    userId TEXT NOT NULL,
    guildId TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY(userId, guildId)
);
`);

module.exports = {

    addPending(inviteeId, inviterId, guildId) {

        db.prepare(`
            INSERT OR IGNORE INTO invites
            (inviteeId, inviterId, guildId, verified)
            VALUES (?, ?, ?, 0)
        `).run(inviteeId, inviterId, guildId);

    },

    getInvite(inviteeId) {

        return db.prepare(`
            SELECT *
            FROM invites
            WHERE inviteeId = ?
        `).get(inviteeId);

    },

    addMessage(userId, guildId) {

        const row = db.prepare(`
            SELECT count
            FROM messages
            WHERE userId = ?
            AND guildId = ?
        `).get(userId, guildId);

        const count = row ? row.count + 1 : 1;

        db.prepare(`
            INSERT OR REPLACE INTO messages
            (userId, guildId, count)
            VALUES (?, ?, ?)
        `).run(userId, guildId, count);

        return count;

    },

    verify(inviteeId) {

        db.prepare(`
            UPDATE invites
            SET verified = 1
            WHERE inviteeId = ?
        `).run(inviteeId);

    },

    getInviteCount(inviterId, guildId) {

        return db.prepare(`
            SELECT COUNT(*) AS total
            FROM invites
            WHERE inviterId = ?
            AND guildId = ?
            AND verified = 1
        `).get(inviterId, guildId).total;

    },

    leaderboard(guildId) {

        return db.prepare(`
            SELECT inviterId,
            COUNT(*) AS total
            FROM invites
            WHERE guildId = ?
            AND verified = 1
            GROUP BY inviterId
            ORDER BY total DESC
            LIMIT 10
        `).all(guildId);

    }

};
