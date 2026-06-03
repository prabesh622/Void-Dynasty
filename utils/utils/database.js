const supabase = require('./supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Insert a record into a table
 * @param {string} table - Table name
 * @param {Object} data - Data to insert
 * @returns {Promise<Object>} - Inserted record
 */
async function insert(table, data) {
  const { data: result, error } = await supabase
    .from(table)
    .insert([{ ...data, id: uuidv4() }])
    .select()
    .single();

  if (error) throw error;
  return result;
}

/**
 * Update a record in a table
 * @param {string} table - Table name
 * @param {Object} updates - Data to update
 * @param {string} column - Column to match (e.g., 'user_id')
 * @param {string} value - Value to match
 * @returns {Promise<Object>} - Updated record
 */
async function update(table, updates, column, value) {
  const { data: result, error } = await supabase
    .from(table)
    .update(updates)
    .eq(column, value)
    .select()
    .single();

  if (error) throw error;
  return result;
}

/**
 * Get a record from a table
 * @param {string} table - Table name
 * @param {string} column - Column to match
 * @param {string} value - Value to match
 * @returns {Promise<Object>} - Record
 */
async function get(table, column, value) {
  const { data: result, error } = await supabase
    .from(table)
    .select('*')
    .eq(column, value)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows found" error
  return result;
}

/**
 * Get multiple records from a table
 * @param {string} table - Table name
 * @param {Object} filters - Filters to apply
 * @param {Object} options - Query options (order, limit, etc.)
 * @returns {Promise<Array>} - Records
 */
async function getMany(table, filters = {}, options = {}) {
  let query = supabase.from(table).select('*');

  // Apply filters
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  // Apply options
  if (options.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending !== false });
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data: result, error } = await query;
  if (error) throw error;
  return result;
}

/**
 * Delete a record from a table
 * @param {string} table - Table name
 * @param {string} column - Column to match
 * @param {string} value - Value to match
 * @returns {Promise<Object>} - Deleted record
 */
async function remove(table, column, value) {
  const { data: result, error } = await supabase
    .from(table)
    .delete()
    .eq(column, value)
    .select()
    .single();

  if (error) throw error;
  return result;
}

module.exports = {
  insert,
  update,
  get,
  getMany,
  remove,
  supabase,
};
