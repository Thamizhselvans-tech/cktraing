const { db } = require('../config/firebase');

if (!db) {
  throw new Error("Firebase database instance not initialized in config/firebase.js");
}

function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise.catch(err => {
      console.error('⚠️ [Firebase] Query promise error:', err.message);
      return null;
    }),
    new Promise((resolve) =>
      setTimeout(() => {
        console.warn(`⚠️ [Firebase] Query timed out after ${ms}ms. Resolving with fallback.`);
        resolve(null);
      }, ms)
    ),
  ]);
}

const queryCache = {};
const CACHE_TTL_MS = 5000;

const firebaseDb = {
  clearCache(node) {
    if (node) delete queryCache[node];
    else Object.keys(queryCache).forEach(k => delete queryCache[k]);
  },

  // Get all items in a node as an array of objects
  async getAll(node) {
    const now = Date.now();
    if (queryCache[node] && (now - queryCache[node].timestamp < CACHE_TTL_MS)) {
      return queryCache[node].data;
    }

    try {
      const snapshot = await withTimeout(db.ref(node).once('value'));
      const val = snapshot ? snapshot.val() : null;
      if (!val) {
        queryCache[node] = { timestamp: now, data: [] };
        return [];
      }
      const data = Object.keys(val).map(key => ({
        _id: key,
        id: key,
        ...val[key]
      }));
      queryCache[node] = { timestamp: now, data };
      return data;
    } catch (err) {
      console.error(`⚠️ [Firebase] Timeout/Error fetching node '${node}':`, err.message);
      return queryCache[node] ? queryCache[node].data : [];
    }
  },

  // Get item by ID
  async getById(node, id) {
    if (!id) return null;
    try {
      const snapshot = await withTimeout(db.ref(`${node}/${id}`).once('value'));
      const val = snapshot ? snapshot.val() : null;
      if (!val) return null;
      return {
        _id: id,
        id: id,
        ...val
      };
    } catch (err) {
      console.error(`⚠️ [Firebase] Timeout/Error fetching '${node}/${id}':`, err.message);
      return null;
    }
  },

  // Find items by filter predicate or query object
  async find(node, filterFn) {
    const all = await this.getAll(node);
    if (typeof filterFn === 'function') {
      return all.filter(filterFn);
    }
    if (typeof filterFn === 'object' && filterFn !== null) {
      return all.filter(item => {
        return Object.keys(filterFn).every(key => {
          if (filterFn[key] instanceof RegExp) {
            return filterFn[key].test(item[key]);
          }
          return item[key] === filterFn[key];
        });
      });
    }
    return all;
  },

  // Find one item by filter
  async findOne(node, filterFn) {
    const results = await this.find(node, filterFn);
    return results.length > 0 ? results[0] : null;
  },

  // Create document in node (Instant sub-5ms write)
  async create(node, data, customId = null) {
    this.clearCache(node);
    const ref = customId ? db.ref(`${node}/${customId}`) : db.ref(node).push();
    const id = customId || ref.key;
    const now = new Date().toISOString();
    const payload = {
      ...data,
      id: id,
      _id: id,
      createdAt: data.createdAt || now,
      updatedAt: now
    };
    ref.set(payload).catch(err => console.error(`⚠️ [Firebase] Background create failed for ${node}/${id}:`, err.message));
    return payload;
  },

  // Update item (Instant sub-5ms write)
  async update(node, id, updates) {
    if (!id) return null;
    this.clearCache(node);
    const ref = db.ref(`${node}/${id}`);
    const now = new Date().toISOString();
    const payload = {
      ...updates,
      updatedAt: now
    };
    ref.update(payload).catch(err => console.error(`⚠️ [Firebase] Background update failed for ${node}/${id}:`, err.message));
    return { _id: id, id, ...payload };
  },

  // Generate new push key
  getNewKey(node) {
    return db.ref(node).push().key;
  },

  // Perform atomic multi-path update in 1 network call
  async multiUpdate(updatesObject) {
    if (!updatesObject || Object.keys(updatesObject).length === 0) return;
    this.clearCache();
    await db.ref().update(updatesObject);
  },

  // Delete item (Instant sub-5ms delete)
  async remove(node, id) {
    if (!id) return false;
    this.clearCache(node);
    db.ref(`${node}/${id}`).remove().catch(err => console.error(`⚠️ [Firebase] Background remove failed for ${node}/${id}:`, err.message));
    return true;
  },

  // Delete matching items
  async removeMany(node, filterFn) {
    const matching = await this.find(node, filterFn);
    for (const item of matching) {
      await db.ref(`${node}/${item._id}`).remove();
    }
    return matching.length;
  },

  // Helper to populate department on objects
  async populateDepartment(item) {
    if (!item) return item;
    if (item.departmentId) {
      const dept = await this.getById('departments', item.departmentId);
      return {
        ...item,
        department: dept || null
      };
    }
    return item;
  },

  // Helper to populate department on array of objects
  async populateDepartmentMany(items) {
    const depts = await this.getAll('departments');
    const deptMap = {};
    depts.forEach(d => { deptMap[d._id] = d; });

    return items.map(item => ({
      ...item,
      department: item.departmentId ? (deptMap[item.departmentId] || null) : null
    }));
  }
};

module.exports = firebaseDb;
