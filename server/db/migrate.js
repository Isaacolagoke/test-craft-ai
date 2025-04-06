const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const supabase = require('./supabase');
const fs = require('fs').promises;

// Use an absolute path for the database
const dbPath = path.resolve(__dirname, '../database.sqlite');

// Promisify SQLite functions
function runQuery(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function migrateData() {
  console.log('Starting data migration from SQLite to Supabase...');
  
  // Check if database file exists
  try {
    await fs.access(dbPath);
  } catch (error) {
    console.log('No SQLite database found. Creating fresh database in Supabase.');
    return;
  }
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Migrate users
    console.log('Migrating users...');
    const users = await runQuery(db, 'SELECT * FROM users');
    if (users.length > 0) {
      const { error } = await supabase.from('users').insert(users);
      if (error) throw new Error(`Error migrating users: ${error.message}`);
      console.log(`${users.length} users migrated successfully.`);
    } else {
      console.log('No users to migrate.');
    }
    
    // Migrate quizzes
    console.log('Migrating quizzes...');
    const quizzes = await runQuery(db, 'SELECT * FROM quizzes');
    for (const quiz of quizzes) {
      // Convert settings from string to JSON if needed
      if (quiz.settings && typeof quiz.settings === 'string') {
        try {
          quiz.settings = JSON.parse(quiz.settings);
        } catch (e) {
          console.warn(`Could not parse settings for quiz ${quiz.id}, keeping as string`);
        }
      }
      
      // Convert is_accepting_responses from integer to boolean
      quiz.is_accepting_responses = !!quiz.is_accepting_responses;
    }
    
    if (quizzes.length > 0) {
      const { error } = await supabase.from('quizzes').insert(quizzes);
      if (error) throw new Error(`Error migrating quizzes: ${error.message}`);
      console.log(`${quizzes.length} quizzes migrated successfully.`);
    } else {
      console.log('No quizzes to migrate.');
    }
    
    // Migrate questions
    console.log('Migrating questions...');
    const questions = await runQuery(db, 'SELECT * FROM questions');
    for (const question of questions) {
      // Convert options from string to JSON if needed
      if (question.options && typeof question.options === 'string') {
        try {
          question.options = JSON.parse(question.options);
        } catch (e) {
          console.warn(`Could not parse options for question ${question.id}, keeping as string`);
        }
      }
    }
    
    if (questions.length > 0) {
      const { error } = await supabase.from('questions').insert(questions);
      if (error) throw new Error(`Error migrating questions: ${error.message}`);
      console.log(`${questions.length} questions migrated successfully.`);
    } else {
      console.log('No questions to migrate.');
    }
    
    // Migrate responses
    console.log('Migrating responses...');
    const responses = await runQuery(db, 'SELECT * FROM responses');
    for (const response of responses) {
      // Convert answers from string to JSON if needed
      if (response.answers && typeof response.answers === 'string') {
        try {
          response.answers = JSON.parse(response.answers);
        } catch (e) {
          console.warn(`Could not parse answers for response ${response.id}, keeping as string`);
        }
      }
    }
    
    if (responses.length > 0) {
      const { error } = await supabase.from('responses').insert(responses);
      if (error) throw new Error(`Error migrating responses: ${error.message}`);
      console.log(`${responses.length} responses migrated successfully.`);
    } else {
      console.log('No responses to migrate.');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    db.close();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateData().catch(console.error);
}

module.exports = { migrateData };
