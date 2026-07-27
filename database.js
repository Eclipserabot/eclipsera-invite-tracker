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
  data[userId] = (data[userId] || 0) + 1;
  save(data);
}

function getInvites(userId) {
  const data = load();
  return data[userId] || 0;
}

module.exports = {
  addInvite,
  getInvites,
};
