import { LocalStorageAdapter } from './localStorage.js'

// To switch to an API backend, replace this with an ApiAdapter instance
// that implements the same StorageAdapter interface.
export const storage = new LocalStorageAdapter()
