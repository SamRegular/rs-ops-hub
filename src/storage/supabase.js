import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    enabled: false
  }
})

// Map of entity types to table names
const TABLE_NAMES = {
  clients: 'clients',
  projects: 'projects',
  documents: 'documents',
  retainers: 'retainers',
}

// Get current user's team ID
async function getTeamId() {
  // TEMPORARY: Hardcoded team_id for testing
  // TODO: Fix proper team lookup later (team_members query not working)
  return 'efe2dda9-ad08-4675-b455-00f885b1a73b'
}

// Convert field names from camelCase to quoted identifiers for SQL
function prepareData(data) {
  return data
}

export const storage = {
  async getAll(entity) {
    const table = TABLE_NAMES[entity]
    if (!table) throw new Error(`Unknown entity: ${entity}`)

    const teamId = await getTeamId()

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('team_id', teamId)

    if (error) throw error
    return data || []
  },

  async get(entity, id) {
    const table = TABLE_NAMES[entity]
    if (!table) throw new Error(`Unknown entity: ${entity}`)

    const teamId = await getTeamId()

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .eq('team_id', teamId)
      .single()

    if (error) throw error
    return data
  },

  async create(entity, data) {
    const table = TABLE_NAMES[entity]
    if (!table) throw new Error(`Unknown entity: ${entity}`)

    const teamId = await getTeamId()

    const insertData = {
      ...data,
      team_id: teamId,
    }

    console.log(`Creating ${entity}:`, insertData)

    const { data: created, error } = await supabase
      .from(table)
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error(`Error creating ${entity}:`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      })
      throw new Error(`Failed to create ${entity}: ${error.message}`)
    }
    return created
  },

  async update(entity, id, data) {
    const table = TABLE_NAMES[entity]
    if (!table) throw new Error(`Unknown entity: ${entity}`)

    const teamId = await getTeamId()

    const updateData = prepareData({
      ...data,
      updated_at: new Date().toISOString(),
    })

    const { data: updated, error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id)
      .eq('team_id', teamId)
      .select()
      .single()

    if (error) throw error
    return updated
  },

  async delete(entity, id) {
    const table = TABLE_NAMES[entity]
    if (!table) throw new Error(`Unknown entity: ${entity}`)

    const teamId = await getTeamId()

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('team_id', teamId)

    if (error) throw error
  },

  // Auth methods
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    return data
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Team management (simplified)
  async getOrCreateTeam(userId) {
    try {
      // Check if user is already in a team
      const { data: existing, error: selectError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (selectError && selectError.code !== 'PGRST116') throw selectError

      if (existing?.team_id) {
        return existing.team_id
      }

      // If no team found, create one
      const { data: newTeam, error: createError } = await supabase
        .from('teams')
        .insert([{ name: `Team (${userId.slice(0, 8)})` }])
        .select()
        .single()

      if (createError) throw createError

      // Add user to new team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([{
          team_id: newTeam.id,
          user_id: userId,
          role: 'admin',
        }])

      if (memberError) throw memberError
      return newTeam.id
    } catch (err) {
      console.error('getOrCreateTeam error:', err)
      throw err
    }
  },

  supabase, // Export for direct access if needed
}

// Auth listener disabled for now - team creation is manual
