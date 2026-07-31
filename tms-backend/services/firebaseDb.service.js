const { db } = require('../config/firebase');

if (!db) {
  throw new Error("Firebase database instance not initialized in config/firebase.js");
}

const FETCH_TIMEOUT_MS = 25000;

function withTimeout(promise, ms = FETCH_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timed out. Please try again.')), ms)
    ),
  ]);
}

const firebaseDb = {
  // Get all items in a node as an array of objects
  async getAll(node) {
    try {
      const snapshot = await withTimeout(db.ref(node).once('value'));
      const val = snapshot ? snapshot.val() : null;
      if (!val) return [];
      return Object.keys(val).map(key => ({
        _id: key,
        id: key,
        ...val[key]
      }));
    } catch (err) {
      console.error(`⚠️ [Firebase] Timeout/Error fetching node '${node}':`, err.message);
      return [];
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

  // Create document in node
  async create(node, data, customId = null) {
    const ref = customId ? db.ref(`${node}/${customId}`) : db.ref(node).push();
    const id = customId || ref.key;
    const now = new Date().toISOString();
    const payload = {
      ...data,
      id: id,
      createdAt: data.createdAt || now,
      updatedAt: now
    };
    await ref.set(payload);
    return { _id: id, id, ...payload };
  },

  // Update item
  async update(node, id, updates) {
    if (!id) return null;
    const ref = db.ref(`${node}/${id}`);
    const now = new Date().toISOString();
    const payload = {
      ...updates,
      updatedAt: now
    };
    await ref.update(payload);
    return this.getById(node, id);
  },

  // Generate new push key
  getNewKey(node) {
    return db.ref(node).push().key;
  },

  // Perform atomic multi-path update in 1 network call
  async multiUpdate(updatesObject) {
    if (!updatesObject || Object.keys(updatesObject).length === 0) return;
    await db.ref().update(updatesObject);
  },

  // Delete item
  async remove(node, id) {
    if (!id) return false;
    await db.ref(`${node}/${id}`).remove();
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
