const fs = require('fs');
const path = require('path');

const THREADS_FILE = path.join(__dirname, 'threads.json');

// In-memory cache - loaded once, written through on changes
let cache = null;

function load() {
  if (cache) return cache;

  if (!fs.existsSync(THREADS_FILE)) {
    cache = { threads: [] };
  } else {
    cache = JSON.parse(fs.readFileSync(THREADS_FILE, 'utf8'));
  }
  if (!cache.threads) cache.threads = [];
  return cache;
}

function save() {
  fs.writeFileSync(THREADS_FILE, JSON.stringify(cache, null, 2));
}

function getThreads() {
  return load().threads;
}

function getThread(threadId) {
  return getThreads().find(t => t.threadId === threadId);
}

function addThread(guildId, threadId, userId) {
  const data = load();
  if (data.threads.find(t => t.threadId === threadId)) return;

  data.threads.push({ guildId, threadId, userId, trackedListings: [] });
  save();
}

function removeThread(threadId) {
  const data = load();
  const before = data.threads.length;
  data.threads = data.threads.filter(t => t.threadId !== threadId);
  if (data.threads.length < before) save();
}

function addTrackedListing(threadId, saleId, itemName) {
  const thread = getThread(threadId);
  if (!thread) return false;

  if (!thread.trackedListings) thread.trackedListings = [];
  if (thread.trackedListings.find(l => l.saleId === saleId)) return false;

  thread.trackedListings.push({ saleId, itemName, createdAt: Date.now() });
  save();
  return true;
}

function removeTrackedListing(threadId, saleId) {
  const thread = getThread(threadId);
  if (!thread?.trackedListings) return false;

  const before = thread.trackedListings.length;
  thread.trackedListings = thread.trackedListings.filter(l => l.saleId !== saleId);
  if (thread.trackedListings.length < before) {
    save();
    return true;
  }
  return false;
}

function getTrackedListings(threadId) {
  return getThread(threadId)?.trackedListings || [];
}

function getAllTrackedSaleIds() {
  const saleIds = new Set();
  for (const thread of getThreads()) {
    for (const listing of thread.trackedListings || []) {
      saleIds.add(listing.saleId);
    }
  }
  return saleIds;
}

function getThreadsTrackingSaleId(saleId) {
  return getThreads().filter(t =>
    t.trackedListings?.some(l => l.saleId === saleId)
  );
}

module.exports = {
  getThreads,
  getThread,
  addThread,
  removeThread,
  addTrackedListing,
  removeTrackedListing,
  getTrackedListings,
  getAllTrackedSaleIds,
  getThreadsTrackingSaleId,
};
