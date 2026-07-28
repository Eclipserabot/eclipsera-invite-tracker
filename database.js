const fs = require("fs");

const FILE = "./database.json";

function load() {
    if (!fs.existsSync(FILE)) {
        fs.writeFileSync(FILE, JSON.stringify({
            invites: {},
            pending: {},
            messages: {}
        }, null, 2));
    }

    return JSON.parse(fs.readFileSync(FILE));
}

function save(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = {

    addPending(memberId, inviterId) {
        const db = load();

        db.pending[memberId] = inviterId;
        db.messages[memberId] = 0;

        save(db);
    },

    addMessage(memberId) {
        const db = load();

        if (!(memberId in db.messages)) return 0;

        db.messages[memberId]++;

        save(db);

        return db.messages[memberId];
    },

    completeInvite(memberId) {
        const db = load();

        const inviter = db.pending[memberId];

        if (!inviter) return null;

        if (!db.invites[inviter])
            db.invites[inviter] = 0;

        db.invites[inviter]++;

        delete db.pending[memberId];
        delete db.messages[memberId];

        save(db);

        return inviter;
    },

    getInvites(userId) {
        const db = load();

        return db.invites[userId] || 0;
    },

    getLeaderboard() {
        const db = load();

        return Object.entries(db.invites)
            .sort((a, b) => b[1] - a[1]);
    }

};
