// Abstract storage adapter — swap this implementation for an API adapter
// when multi-user backend is ready. All methods return Promises.
export class StorageAdapter {
  async getAll(entity) { throw new Error('Not implemented') }
  async getById(entity, id) { throw new Error('Not implemented') }
  async create(entity, data) { throw new Error('Not implemented') }
  async update(entity, id, data) { throw new Error('Not implemented') }
  async delete(entity, id) { throw new Error('Not implemented') }
  async query(entity, predicate) { throw new Error('Not implemented') }
}
