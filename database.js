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
    userId TEXT,
    guildId TEXT,
    count INTEGER DEFAULT 0,
    PRIMARY KEY(userId, guildId)
);
`);

function addPending(inviteeId, inviterId, guildId) {
    db.prepare(`
        INSERT OR IGNORE INTO invites
        (inviteeId, inviterId, guildId, verified)
        VALUES (?, ?, ?, 0)
    `).run(inviteeId, inviterId, guildId);
}

function getPending(inviteeId, guildId) {
    return db.prepare(`
        SELECT *
        FROM invites
        WHERE inviteeId = ?
        AND guildId = ?
    `).get(inviteeId, guildId);
}

function addMessage(userId, guildId) {
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
}

function verifyInvite(inviteeId, guildId) {
    db.prepare(`
        UPDATE invites
        SET verified = 1
        WHERE inviteeId = ?
        AND guildId = ?
    `).run(inviteeId, guildId);

    db.prepare(`
        DELETE FROM messages
        WHERE userId = ?
        AND guildId = ?
    `).run(inviteeId, guildId);
}

function getInviteCount(inviterId, guildId) {
    const row = db.prepare(`
        SELECT COUNT(*) AS count
        FROM invites
        WHERE inviterId = ?
        AND guildId = ?
        AND verified = 1
    `).get(inviterId, guildId);

    return row.count;
}

function getLeaderboard(guildId) {
    return db.prepare(`
        SELECT inviterId,
               COUNT(*) AS count
        FROM invites
        WHERE guildId = ?
        AND verified = 1
        GROUP BY inviterId
        ORDER BY count DESC
        LIMIT 10
    `).all(guildId);
}

module.exports = {
    addPending,
    getPending,
    addMessage,
    verifyInvite,
    getInviteCount,
    getLeaderboard
};
