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
 * @param {string|Object} settings - Quiz settings
 * @returns {Promise<Object>} - Returns the created quiz
 */
async function createQuiz(creatorId, title, description, settings) {
  try {
    console.log('Creating quiz with params:', {
      creatorId,
      title,
      hasDescription: !!description,
      settingsType: typeof settings
    });

    // Handle settings properly - it could be a string or an object
    let settingsObj;
    if (typeof settings === 'string') {
      try {
        settingsObj = JSON.parse(settings);
        console.log('Successfully parsed settings string');
      } catch (e) {
        console.warn('Error parsing settings string, using empty object:', e);
        settingsObj = {};
      }
    } else if (settings) {
      console.log('Settings already an object, using directly');
      settingsObj = settings;
    } else {
      console.log('No settings provided, using empty object');
      settingsObj = {};
    }

    // Ensure key settings fields are present
    settingsObj = {
      subject: settingsObj.subject || settingsObj.category || 'General',
      category: settingsObj.category || settingsObj.subject || 'General',
      duration: settingsObj.duration || 10,
      timeUnit: settingsObj.timeUnit || 'minutes',
      difficulty: settingsObj.difficulty || settingsObj.complexity || 'Medium',
      ...settingsObj
    };

    console.log('Processed settings object:', settingsObj);

    // Ensure we have valid title
    if (!title) {
      title = 'Untitled Quiz';
    }

    // Ensure creator_id is a number
    const creatorIdNum = parseInt(creatorId, 10);
    if (isNaN(creatorIdNum)) {
      throw new Error(`Invalid creator_id: ${creatorId}`);
    }

    console.log('Inserting quiz into database');
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        creator_id: creatorIdNum,
        title,
        description: description || '',
        settings: settingsObj,
        status: 'draft'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error creating quiz:', error);
      throw error;
    }
    
    console.log('Quiz created successfully:', data?.id);
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
 * @param {string} text - Question text (may be passed as 'content' from frontend)
 * @param {string} options - JSON options string
 * @param {string} correctAnswer - Correct answer
 * @returns {Promise<Object>} - Returns the created question
 */
async function createQuestion(quizId, type, text, options, correctAnswer) {
  try {
    // Handle options properly - it could be a string or array
    let optionsArray;
    if (typeof options === 'string') {
      try {
        optionsArray = JSON.parse(options);
      } catch (e) {
        console.warn('Error parsing options string, using as-is:', e);
        optionsArray = options;
      }
    } else {
      optionsArray = options || [];
    }

    const { data, error } = await supabase
      .from('questions')
      .insert({
        quiz_id: quizId,
        type,
        text, // The frontend might pass this as 'content', but it's already mapped in the router
        options: optionsArray,
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
 * Update quiz content (title and description)
 * @param {number} id - Quiz ID 
 * @param {string} title - Quiz title
 * @param {string} description - Quiz description
 * @returns {Promise<Object>} - Returns updated quiz
 */
async function updateQuizContent(id, title, description) {
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
 * Update a quiz
 * @param {number} id - Quiz ID 
 * @param {Object} updates - Updates to apply to the quiz
 * @returns {Promise<Object>} - Returns updated quiz
 */
async function updateQuiz(id, updates) {
  try {
    console.log(`Updating quiz ${id} with:`, JSON.stringify(updates));
    
    // If updates contains settings, ensure it's properly formatted
    if (updates.settings) {
      let settingsObj;
      
      // Parse settings if it's a string
      if (typeof updates.settings === 'string') {
        try {
          settingsObj = JSON.parse(updates.settings);
        } catch (e) {
          console.error('Error parsing settings string:', e);
          settingsObj = {};
        }
      } else {
        settingsObj = updates.settings;
      }
      
      // Ensure key settings fields are present and properly named
      settingsObj = {
        // Ensure basic fields are present with correct naming
        subject: settingsObj.subject || settingsObj.category || 'General',
        category: settingsObj.category || settingsObj.subject || 'General',
        duration: settingsObj.duration || settingsObj.timeLimit || 10,
        timeUnit: settingsObj.timeUnit || 'minutes',
        difficulty: settingsObj.difficulty || settingsObj.complexity || 'Medium',
        ...settingsObj
      };
      
      // Replace the settings in updates
      updates.settings = settingsObj;
    }
    
    const { data, error } = await supabase
      .from('quizzes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating quiz ${id}:`, error);
      throw error;
    }
    
    console.log(`Quiz ${id} updated successfully`);
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

/**
 * Get quiz by access code
 * @param {string} accessCode - The quiz access code
 * @returns {Promise<Object|null>} - Returns the quiz or null if not found
 */
async function getQuizByAccessCode(accessCode) {
  try {
    console.log(`[DEBUG] getQuizByAccessCode: Searching for quiz with access code "${accessCode}"`);
    
    if (!accessCode) {
      console.error('[ERROR] getQuizByAccessCode: No access code provided');
      return null;
    }
    
    // Get all published quizzes with settings
    console.log('[DEBUG] getQuizByAccessCode: Fetching all published quizzes with settings');
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('status', 'published');
      
    if (error) {
      console.error('[ERROR] getQuizByAccessCode: Database error:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log('[DEBUG] getQuizByAccessCode: No published quizzes found');
      return null;
    }
    
    console.log(`[DEBUG] getQuizByAccessCode: Found ${data.length} published quizzes. Checking for access code match...`);
    
    // Dump all quiz data for debugging
    data.forEach(quiz => {
      console.log(`[DEBUG] Quiz ID: ${quiz.id}, Title: ${quiz.title}, Settings Type: ${typeof quiz.settings}`);
      
      if (typeof quiz.settings === 'string') {
        try {
          const parsed = JSON.parse(quiz.settings);
          console.log(`[DEBUG] Parsed settings for quiz ${quiz.id}:`, parsed);
        } catch (e) {
          console.error(`[ERROR] Could not parse settings for quiz ${quiz.id}:`, e.message);
        }
      } else if (quiz.settings) {
        console.log(`[DEBUG] Settings for quiz ${quiz.id} (already object):`, quiz.settings);
      } else {
        console.log(`[DEBUG] Quiz ${quiz.id} has no settings`);
      }
    });
    
    // Find the quiz with matching access code in settings
    const matchedQuiz = data.find(quiz => {
      let settings;
      try {
        if (typeof quiz.settings === 'string') {
          settings = JSON.parse(quiz.settings);
        } else {
          settings = quiz.settings;
        }
        
        const matches = settings && settings.accessCode === accessCode;
        if (matches) {
          console.log(`[DEBUG] Found matching quiz! ID: ${quiz.id}, Title: ${quiz.title}`);
        }
        return matches;
      } catch (e) {
        console.error(`[ERROR] Error parsing settings for quiz ${quiz.id}:`, e.message);
        return false;
      }
    });
    
    if (matchedQuiz) {
      console.log(`[DEBUG] getQuizByAccessCode: Successfully found quiz with access code "${accessCode}": Quiz ID ${matchedQuiz.id}`);
      return matchedQuiz;
    } else {
      console.log(`[DEBUG] getQuizByAccessCode: No quiz found with access code "${accessCode}" after checking all quizzes`);
      return null;
    }
  } catch (error) {
    console.error('[ERROR] getQuizByAccessCode: Unhandled error:', error);
    return null;
  }
}

/**
 * Insert a new quiz submission
 * @param {Object} submission - The submission data
 * @returns {Promise<string>} - The submission ID
 */
async function insertSubmission(submission) {
  try {
    console.log(`[DEBUG] insertSubmission: Storing submission for quiz ${submission.quiz_id}`);
    
    // Ensure we have valid data
    if (!submission.quiz_id) {
      console.error('[ERROR] insertSubmission: Missing quiz_id');
      throw new Error('Missing quiz_id');
    }
    
    // Create the submission record
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        quiz_id: submission.quiz_id,
        learner_id: submission.learner_id || 'anonymous_learner',
        responses: typeof submission.responses === 'string' 
          ? submission.responses 
          : JSON.stringify(submission.responses),
        metadata: typeof submission.metadata === 'string'
          ? submission.metadata
          : JSON.stringify(submission.metadata),
        submitted_at: submission.submitted_at || new Date().toISOString(),
        status: submission.status || 'submitted'
      })
      .select();
    
    if (error) {
      console.error('[ERROR] insertSubmission:', error);
      // If the submissions table doesn't exist, create it
      if (error.code === '42P01') { // PostgreSQL error code for undefined_table
        await createSubmissionsTable();
        // Try again after creating the table
        return insertSubmission(submission);
      }
      throw error;
    }
    
    console.log(`[DEBUG] insertSubmission: Successfully stored submission with ID: ${data[0]?.id}`);
    return data[0]?.id;
  } catch (error) {
    console.error('[ERROR] insertSubmission:', error);
    // If this is a more specific table structure issue, create the table
    await createSubmissionsTable();
    throw error;
  }
}

/**
 * Create the submissions table if it doesn't exist
 * @returns {Promise<boolean>} - True if successful
 */
async function createSubmissionsTable() {
  try {
    console.log('[DEBUG] Creating submissions table...');
    
    // Check if the table already exists
    const { error: checkError } = await supabase
      .from('submissions')
      .select('id')
      .limit(1);
    
    // If we can query the table, it exists
    if (!checkError) {
      console.log('[DEBUG] Submissions table already exists');
      return true;
    }
    
    console.log('[DEBUG] Table does not exist, creating it now...');
    
    // Create the table directly using SQL
    const { error } = await supabase.rpc('exec_sql', { 
      sql: `
        CREATE TABLE IF NOT EXISTS submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          quiz_id UUID REFERENCES quizzes(id),
          learner_id TEXT,
          responses JSONB,
          metadata JSONB,
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          status TEXT DEFAULT 'submitted',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `
    });
    
    if (error) {
      console.error('[ERROR] Failed to create submissions table via RPC:', error);
      
      // Fallback to direct query
      const { error: sqlError } = await supabase.sql`
        CREATE TABLE IF NOT EXISTS submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          quiz_id UUID REFERENCES quizzes(id),
          learner_id TEXT,
          responses JSONB,
          metadata JSONB,
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          status TEXT DEFAULT 'submitted',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `;
      
      if (sqlError) {
        console.error('[ERROR] Failed to create submissions table with SQL:', sqlError);
        
        // Try a more basic approach without references if that's the issue
        const { error: basicError } = await supabase.sql`
          CREATE TABLE IF NOT EXISTS submissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quiz_id TEXT,
            learner_id TEXT,
            responses JSONB,
            metadata JSONB,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            status TEXT DEFAULT 'submitted',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
        `;
        
        if (basicError) {
          console.error('[ERROR] Failed to create basic submissions table:', basicError);
          return false;
        }
      }
    }
    
    console.log('[DEBUG] Successfully created submissions table');
    return true;
  } catch (error) {
    console.error('[ERROR] createSubmissionsTable:', error);
    return false;
  }
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
  updateQuizContent,
  updateQuiz,
  updateQuizSettings,
  updateQuizStatus,
  deleteQuiz,
  getUser,
  saveResponse,
  getSubmissions,
  getTable,
  createTable,
  getQuizByAccessCode,
  insertSubmission,
  createSubmissionsTable
};
