const fs = require("fs");

const FILE = "./invites.json";

function load() {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function save(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function addInvite(userId) {
    const data = load();

    if (!data[userId]) {
        data[userId] = 0;
    }

    data[userId]++;

    save(data);
}

function getInvites(userId) {
    const data = load();
    return data[userId] || 0;
}

function getLeaderboard() {
    const data = load();

    return Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
}

module.exports = {
    addInvite,
    getInvites,
    getLeaderboard
};
