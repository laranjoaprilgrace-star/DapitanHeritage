// Admin overrides and visitor notices. Mount it in your server:
//   app.use("/api/live", require("./live.cjs"));
// Admin login: set ADMIN_USER and ADMIN_PASS in the environment
// (defaults for the prototype: admin / admin123).
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "live-data.json");
const USER = process.env.ADMIN_USER || "admin";
const PASS = process.env.ADMIN_PASS || "admin123";
const tokens = new Set(); // active admin sessions (cleared when the server restarts)

const router = express.Router();
router.use(express.json());

const read = () => { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return { overrides: {}, messages: [] }; } };
const write = data => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
const count = n => Math.max(0, Math.round(Number(n) || 0));
const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const admin = (req, res, next) =>
  tokens.has((req.get("authorization") || "").replace(/^Bearer /, "")) ? next() : res.status(401).json({ error: "not signed in" });

router.get("/", (req, res) => res.json(read()));

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!same(username, USER) || !same(password, PASS)) return res.status(401).json({ error: "wrong username or password" });
  const token = crypto.randomBytes(24).toString("hex");
  tokens.add(token);
  res.json({ token });
});

router.put("/sites/:id", admin, (req, res) => {
  const data = read();
  data.overrides[req.params.id] = { currentVisitors: count(req.body.currentVisitors), capacity: Math.max(1, count(req.body.capacity)) };
  write(data);
  res.json(data);
});

router.delete("/sites/:id", admin, (req, res) => {
  const data = read();
  delete data.overrides[req.params.id];
  write(data);
  res.json(data);
});

router.post("/messages", admin, (req, res) => {
  const text = String(req.body.text || "").trim().slice(0, 200);
  if (!text) return res.status(400).json({ error: "empty message" });
  const data = read();
  data.messages.unshift({ id: Date.now().toString(36), text, siteId: req.body.siteId || null, createdAt: new Date().toISOString() });
  data.messages = data.messages.slice(0, 50);
  write(data);
  res.json(data);
});

router.delete("/messages/:id", admin, (req, res) => {
  const data = read();
  data.messages = data.messages.filter(m => m.id !== req.params.id);
  write(data);
  res.json(data);
});

module.exports = router;
