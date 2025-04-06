const supabase = require('./supabase');

/**
 * Fetch a single row from the database
 * @param {string} table - The table name
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} - Returns a single row or null
 */
async function get(table, query = {}) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .match(query)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error in get operation on ${table}:`, error);
    return null;
  }
}

/**
 * Fetch multiple rows from the database
 * @param {string} table - The table name
 * @param {Object} query - Query parameters
 * @param {Object} options - Additional options (orderBy, limit)
 * @returns {Promise<Array>} - Returns an array of rows
 */
async function all(table, query = {}, options = {}) {
  try {
    let queryBuilder = supabase
      .from(table)
      .select('*');
    
    // Add filter conditions if query is provided
    if (Object.keys(query).length > 0) {
      queryBuilder = queryBuilder.match(query);
    }
    
    // Add order by if specified
    if (options.orderBy) {
      queryBuilder = queryBuilder.order(options.orderBy, { 
        ascending: options.ascending !== false 
      });
    }
    
    // Add limit if specified
    if (options.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error in all operation on ${table}:`, error);
    return [];
  }
}

/**
 * Insert a new row into the database
 * @param {string} table - The table name
 * @param {Object} values - Values to insert
 * @returns {Promise<Object>} - Returns the inserted row
 */
async function insert(table, values) {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(values)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error in insert operation on ${table}:`, error);
    throw error;
  }
}

/**
 * Update rows in the database
 * @param {string} table - The table name
 * @param {Object} query - Query to match rows to update
 * @param {Object} values - Values to update
 * @returns {Promise<Object>} - Returns updated rows
 */
async function update(table, query, values) {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(values)
      .match(query)
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error in update operation on ${table}:`, error);
    throw error;
  }
}

/**
 * Delete rows from the database
 * @param {string} table - The table name
 * @param {Object} query - Query to match rows to delete
 * @returns {Promise<boolean>} - Returns true if successful
 */
async function remove(table, query) {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .match(query);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error in delete operation on ${table}:`, error);
    throw error;
  }
}

/**
 * Run a custom query using Supabase's rpc function for complex operations
 * @param {string} functionName - The PostgreSQL function name to call
 * @param {Object} params - Parameters to pass to the function
 * @returns {Promise<any>} - Returns the result of the function
 */
async function run(functionName, params = {}) {
  try {
    const { data, error } = await supabase
      .rpc(functionName, params);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error in rpc call to ${functionName}:`, error);
    throw error;
  }
}

/**
 * Get a quiz by ID, optionally filtering by creator ID
 * @param {number} id - Quiz ID
 * @param {number} creatorId - Optional creator ID
 * @returns {Promise<Object>} - Returns quiz object or null
 */
async function getQuiz(id, creatorId = null) {
  try {
    let queryBuilder = supabase.from('quizzes').select('*').eq('id', id);
    
    if (creatorId) {
      queryBuilder = queryBuilder.eq('creator_id', creatorId);
    }
    
    const { data, error } = await queryBuilder.single();
    
    if (error && error.code !== 'PGRST116') { // Ignore "no rows returned" error
      throw error;
    }
    
    return data || null;
  } catch (error) {
    console.error(`Error getting quiz ${id}:`, error);
    return null;
  }
}

/**
 * Get all quizzes, optionally filtered by creator
 * @param {number} creatorId - Optional creator ID filter
 * @returns {Promise<Array>} - Returns array of quizzes
 */
async function getQuizzes(creatorId = null) {
  try {
    let queryBuilder = supabase.from('quizzes').select('*');
    
    if (creatorId) {
      queryBuilder = queryBuilder.eq('creator_id', creatorId);
    }
    
    // For compatibility with the existing code that filters published quizzes
    // We'll keep all quizzes and filter in memory where needed
    
    const { data, error } = await queryBuilder.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting quizzes:', error);
    return [];
  }
}

/**
 * Get questions for a quiz
 * @param {number} quizId - Quiz ID
 * @returns {Promise<Array>} - Returns array of questions
 */
async function getQuestions(quizId) {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('id');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error getting questions for quiz ${quizId}:`, error);
    return [];
  }
}

/**
 * Create a new quiz
 * @param {number} creatorId - Creator ID
 * @param {string} title - Quiz title
 * @param {string} description - Quiz description
 * @param {string} settings - JSON settings string
 * @returns {Promise<Object>} - Returns the created quiz
 */
async function createQuiz(creatorId, title, description, settings) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        creator_id: creatorId,
        title,
        description,
        settings: settings ? JSON.parse(settings) : {},
        status: 'draft'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating quiz:', error);
    throw error;
  }
}

/**
 * Create a new question
 * @param {number} quizId - Quiz ID
 * @param {string} type - Question type
 * @param {string} text - Question text
 * @param {string} options - JSON options string
 * @param {string} correctAnswer - Correct answer
 * @returns {Promise<Object>} - Returns the created question
 */
async function createQuestion(quizId, type, text, options, correctAnswer) {
  try {
    const { data, error } = await supabase
      .from('questions')
      .insert({
        quiz_id: quizId,
        type,
        text,
        options: options ? JSON.parse(options) : [],
        correct_answer: correctAnswer
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating question:', error);
    throw error;
  }
}

/**
 * Update a quiz
 * @param {number} id - Quiz ID
 * @param {string} title - Quiz title
 * @param {string} description - Quiz description
 * @returns {Promise<Object>} - Returns updated quiz
 */
async function updateQuiz(id, title, description) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .update({ title, description })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating quiz ${id}:`, error);
    throw error;
  }
}

/**
 * Update quiz settings
 * @param {number} id - Quiz ID
 * @param {string} settings - JSON settings string
 * @returns {Promise<Object>} - Returns updated quiz
 */
async function updateQuizSettings(id, settings) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .update({ 
        settings: settings ? JSON.parse(settings) : {} 
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating quiz settings for ${id}:`, error);
    throw error;
  }
}

/**
 * Update quiz status (published/draft)
 * @param {number} id - Quiz ID
 * @param {string|boolean} status - New status or boolean for accepting responses
 * @returns {Promise<Object>} - Returns updated quiz
 */
async function updateQuizStatus(id, status) {
  try {
    let updateData = {};
    
    if (typeof status === 'boolean') {
      // Handle is_accepting_responses update
      updateData.is_accepting_responses = status;
    } else {
      // Handle status update (published/draft)
      updateData.status = status;
      if (status === 'published') {
        updateData.published_at = new Date().toISOString();
      }
    }
    
    const { data, error } = await supabase
      .from('quizzes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating quiz status for ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a quiz
 * @param {number} id - Quiz ID
 * @returns {Promise<boolean>} - Returns true if successful
 */
async function deleteQuiz(id) {
  try {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting quiz ${id}:`, error);
    throw error;
  }
}

/**
 * Get a user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object>} - Returns user object
 */
async function getUser(id) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Ignore "no rows returned" error
      throw error;
    }
    
    return data || null;
  } catch (error) {
    console.error(`Error getting user ${id}:`, error);
    return null;
  }
}

/**
 * Save a quiz response
 * @param {number} quizId - Quiz ID
 * @param {number} userId - User ID
 * @param {string} answers - JSON string of answers
 * @param {number} score - Score percentage
 * @returns {Promise<Object>} - Returns the saved response
 */
async function saveResponse(quizId, userId, answers, score) {
  try {
    const { data, error } = await supabase
      .from('responses')
      .insert({
        quiz_id: quizId,
        user_id: userId,
        answers: answers ? JSON.parse(answers) : {},
        score
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving response:', error);
    throw error;
  }
}

/**
 * Get quiz submissions
 * These are special-case functions to handle the complex queries in the original code
 */
async function getSubmissions(query, quizId) {
  try {
    // For now, we'll simplify this to just get responses for the quiz
    // In a real implementation, we would create a more complex join in Postgres
    const { data, error } = await supabase
      .from('responses')
      .select(`
        *,
        users:user_id (id, name, email)
      `)
      .eq('quiz_id', quizId)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    
    // Format response to match the expected structure
    return data.map(item => ({
      id: item.id,
      quiz_id: item.quiz_id,
      user_id: item.user_id,
      user_name: item.users?.name || 'Anonymous',
      user_email: item.users?.email || 'unknown',
      answers: item.answers,
      score: item.score,
      submitted_at: item.submitted_at
    }));
  } catch (error) {
    console.error(`Error getting submissions for quiz ${quizId}:`, error);
    return [];
  }
}

/**
 * Legacy support function for table existence checks
 * Supabase doesn't need this, but keeping for API compatibility
 */
async function getTable() {
  // Tables always exist in Supabase since we created them in schema.sql
  return true;
}

/**
 * Legacy support function for table creation
 * Supabase doesn't need this, but keeping for API compatibility
 */
async function createTable() {
  // Tables already exist in Supabase
  return true;
}

// Export functions and supabase client for direct access if needed
module.exports = {
  supabase,
  get,
  all,
  insert,
  update,
  remove,
  run,
  getQuiz,
  getQuizzes,
  getQuestions,
  createQuiz,
  createQuestion,
  updateQuiz,
  updateQuizSettings,
  updateQuizStatus,
  deleteQuiz,
  getUser,
  saveResponse,
  getSubmissions,
  getTable,
  createTable
};
