/**
 * Bethesda SMS — ZKTeco K40 sync bridge
 *
 * Runs on a Raspberry Pi on the same LAN as the device. Polls attendance
 * logs, maps them to CHECK_IN/CHECK_OUT, and POSTs them to the Next.js
 * app's /api/attendance/sync endpoint. If the app is unreachable (flaky
 * site internet), unsent logs are queued to a local JSON file and retried
 * on the next poll — never assume constant connectivity.
 *
 * Run with pm2 so it survives reboots: `npm run pm2`
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const ZKLib = require("node-zklib");

const {
  DEVICE_IP,
  DEVICE_PORT = "4370",
  DEVICE_ID,
  API_URL,
  DEVICE_SYNC_SECRET,
  POLL_INTERVAL_MINUTES = "5",
  QUEUE_FILE = "./queue.json",
} = process.env;

if (!DEVICE_IP || !DEVICE_ID || !API_URL || !DEVICE_SYNC_SECRET) {
  console.error(
    "Missing required env vars — copy .env.example to .env and fill it in.",
  );
  process.exit(1);
}

const queuePath = path.resolve(__dirname, QUEUE_FILE);

function loadQueue() {
  if (!fs.existsSync(queuePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(queuePath, "utf8"));
  } catch {
    return [];
  }
}

function saveQueue(logs) {
  fs.writeFileSync(queuePath, JSON.stringify(logs, null, 2));
}

async function postLogs(logs) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-sync-secret": DEVICE_SYNC_SECRET,
    },
    body: JSON.stringify({ deviceId: DEVICE_ID, logs }),
  });

  if (!res.ok) {
    throw new Error(`Sync failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function pollOnce() {
  const zk = new ZKLib(DEVICE_IP, Number(DEVICE_PORT), 10000, 4000);

  let newLogs = [];
  try {
    await zk.createSocket();
    const { data } = await zk.getAttendances();
    // node-zklib returns { userSn, deviceUserId, recordTime, type, ... }
    // type 0/1 map to CHECK_IN/CHECK_OUT on most K40 firmware.
    newLogs = data.map((entry) => ({
      staffCode: String(entry.deviceUserId),
      timestamp: new Date(entry.recordTime).toISOString(),
      type: entry.type === 1 ? "CHECK_OUT" : "CHECK_IN",
    }));
  } catch (err) {
    console.error("Device poll failed:", err.message);
  } finally {
    await zk.disconnect().catch(() => {});
  }

  const queued = loadQueue();
  const pending = [...queued, ...newLogs];

  if (pending.length === 0) {
    console.log(`[${new Date().toISOString()}] No new logs.`);
    return;
  }

  try {
    const result = await postLogs(pending);
    console.log(
      `[${new Date().toISOString()}] Synced ${result.created} logs (${result.skipped} skipped).`,
    );
    saveQueue([]); // cleared — sent successfully
  } catch (err) {
    console.error("Could not reach the app, queuing for retry:", err.message);
    saveQueue(pending);
  }
}

pollOnce();
setInterval(pollOnce, Number(POLL_INTERVAL_MINUTES) * 60 * 1000);
