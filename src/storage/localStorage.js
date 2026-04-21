import { StorageAdapter } from './adapter.js'

const PREFIX = 'rs-ops-hub:'

export class LocalStorageAdapter extends StorageAdapter {
  _key(entity) {
    return `${PREFIX}${entity}`
  }

  async getAll(entity) {
    try {
      const raw = localStorage.getItem(this._key(entity))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  async getById(entity, id) {
    const all = await this.getAll(entity)
    return all.find(item => item.id === id) ?? null
  }

  async create(entity, data) {
    const all = await this.getAll(entity)
    const item = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(this._key(entity), JSON.stringify([...all, item]))
    return item
  }

  async update(entity, id, data) {
    const all = await this.getAll(entity)
    const updated = all.map(item => item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item)
    localStorage.setItem(this._key(entity), JSON.stringify(updated))
    return updated.find(item => item.id === id) ?? null
  }

  async delete(entity, id) {
    const all = await this.getAll(entity)
    localStorage.setItem(this._key(entity), JSON.stringify(all.filter(item => item.id !== id)))
  }

  async query(entity, predicate) {
    const all = await this.getAll(entity)
    return all.filter(predicate)
  }
}
