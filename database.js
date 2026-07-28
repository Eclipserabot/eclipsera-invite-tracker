const fs = require("fs");

const FILE = "./database.json";

function load() {
    if (!fs.existsSync(FILE)) {
        return {
            invites: {},
            pending: {},
            messages: {}
        };
    }

    return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function save(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function addPending(userId, inviterId) {
    const data = load();
    data.pending[userId] = inviterId;
    data.messages[userId] = 0;
    save(data);
}

function addMessage(userId) {
    const data = load();

    if (data.messages[userId] === undefined) return 0;

    data.messages[userId]++;

    save(data);

    return data.messages[userId];
}

function getInviter(userId) {
    const data = load();
    return data.pending[userId];
}

function completeInvite(userId) {
    const data = load();

    const inviterId = data.pending[userId];

    if (!inviterId) return;

    if (!data.invites[inviterId]) {
        data.invites[inviterId] = 0;
    }

    data.invites[inviterId]++;

    delete data.pending[userId];
    delete data.messages[userId];

    save(data);
}

function getInvites(userId) {
    const data = load();
    return data.invites[userId] || 0;
}

function getLeaderboard() {
    const data = load();

    return Object.entries(data.invites)
        .sort((a, b) => b[1] - a[1]);
}

module.exports = {
    addPending,
    addMessage,
    getInviter,
    completeInvite,
    getInvites,
    getLeaderboard
};
