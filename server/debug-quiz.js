// Debug script for directly testing quiz publishing and access
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const db = require('./db/index');

// Log environment variables for debugging (without showing actual values)
console.log('Environment variables:');
console.log('SUPABASE_URL present:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_KEY present:', !!process.env.SUPABASE_KEY);

// Create a direct Supabase client for testing
let supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Missing Supabase credentials in .env file');
  console.log('\nFor testing, we will use hardcoded values:'); 
  
  // NOTE: We're hardcoding only the URL since it's public
  // You need to add your key below for testing
  supabaseUrl = 'https://zorceesdshidcbxgnijy.supabase.co';
  // Add your API key from Supabase dashboard here for testing:
  supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmNlZXNkc2hpZGNieGduaWp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NjI1NTYsImV4cCI6MjA1OTUzODU1Nn0.yrosyw3D-kW1oFTEBxWHUAXRtat7KV1ACgDbBO7Wb3s';
  
  console.log('Using hardcoded Supabase URL for testing');
  console.log('⚠️ IMPORTANT: You must update the script with your Supabase API key for testing');
}

// Create dedicated Supabase client for testing
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// Direct Supabase Access Test Functions
// ==========================================

async function testSupabaseConnection() {
  console.log('\n----- Testing Supabase Connection -----');
  try {
    const { data, error } = await supabase.from('quizzes').select('count');
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    console.log('✅ Supabase connection successful!');
    return true;
  } catch (err) {
    console.error('❌ Exception connecting to Supabase:', err);
    return false;
  }
}

async function getQuizById(quizId) {
  console.log(`\n----- Getting Quiz ${quizId} -----`);
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();
      
    if (error) {
      console.error(`❌ Error getting quiz ${quizId}:`, error);
      return null;
    }
    
    console.log('✅ Quiz data retrieved:', data);
    return data;
  } catch (err) {
    console.error(`❌ Exception getting quiz ${quizId}:`, err);
    return null;
  }
}

async function updateQuizSettings(quizId, settingsObject) {
  console.log(`\n----- Updating Quiz ${quizId} Settings -----`);
  try {
    // First, get the current quiz to make sure we're updating correctly
    const currentQuiz = await getQuizById(quizId);
    if (!currentQuiz) {
      console.error('Cannot update quiz: quiz not found');
      return false;
    }
    
    // Handle case where settings is already a string
    let existingSettings = {};
    if (currentQuiz.settings) {
      if (typeof currentQuiz.settings === 'string') {
        try {
          existingSettings = JSON.parse(currentQuiz.settings);
        } catch (e) {
          console.warn('Could not parse existing settings, starting fresh');
        }
      } else {
        existingSettings = currentQuiz.settings;
      }
    }
    
    // Merge the new settings with existing ones
    const updatedSettings = { 
      ...existingSettings,
      ...settingsObject,
      accessCode: settingsObject.accessCode || existingSettings.accessCode || generateAccessCode()
    };
    
    console.log('Merged settings:', updatedSettings);
    
    // Update the quiz
    const updates = {
      settings: updatedSettings,
      updated_at: new Date().toISOString()
    };
    
    // If we're publishing, add status changes
    if (settingsObject.publish === true) {
      updates.status = 'published';
      updates.published_at = new Date().toISOString();
      delete updates.settings.publish; // Remove temporary flag
    }
    
    const { data, error } = await supabase
      .from('quizzes')
      .update(updates)
      .eq('id', quizId)
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error updating quiz ${quizId}:`, error);
      return false;
    }
    
    console.log('✅ Quiz updated successfully:', data);
    return data;
  } catch (err) {
    console.error(`❌ Exception updating quiz ${quizId}:`, err);
    return false;
  }
}

function generateAccessCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ==========================================
// DB API Test Functions
// ==========================================

async function testGetQuizViaDb(quizId, userId) {
  console.log(`\n----- Testing db.getQuiz for Quiz ${quizId} -----`);
  try {
    const quiz = await db.getQuiz(quizId, userId);
    if (!quiz) {
      console.error(`❌ Could not find quiz ${quizId} for user ${userId}`);
      return null;
    }
    console.log('✅ Quiz retrieved via db API:', quiz);
    return quiz;
  } catch (err) {
    console.error(`❌ Exception in db.getQuiz:`, err);
    return null;
  }
}

async function testPublishQuizViaDb(quizId, userId) {
  console.log(`\n----- Testing db.updateQuiz (publish) for Quiz ${quizId} -----`);
  try {
    // Generate settings with accessCode
    const accessCode = generateAccessCode();
    const settings = {
      accessCode,
      category: "Test Category",
      complexity: "medium",
      duration: 30,
      timeUnit: "minutes"
    };
    
    // Update with publish status
    const updates = {
      status: 'published',
      published_at: new Date().toISOString(),
      settings
    };
    
    console.log('Updates to apply:', updates);
    
    const result = await db.updateQuiz(quizId, updates);
    if (!result) {
      console.error(`❌ Failed to publish quiz ${quizId}`);
      return null;
    }
    
    console.log('✅ Quiz published via db API:', result);
    return result;
  } catch (err) {
    console.error(`❌ Exception in db.updateQuiz:`, err);
    return null;
  }
}

// ==========================================
// Main Test Function
// ==========================================

async function runTests() {
  // First check connection
  const connected = await testSupabaseConnection();
  if (!connected) {
    console.error('Cannot continue tests: Supabase connection failed');
    return;
  }
  
  console.log('\n----- Testing Supabase Connection -----');
  if (supabase) {
    console.log('✅ Supabase connection successful!');
    
    console.log('\n===== LISTING ALL QUIZZES =====');
    
    // List all quizzes in the database
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (quizzesError) {
      console.log('❌ Error fetching quizzes:', quizzesError);
    } else {
      console.log(`Found ${quizzes.length} quizzes in the database:`);
      quizzes.forEach((quiz, index) => {
        console.log(`\n--- Quiz ${index + 1}: ID ${quiz.id} ---`);
        console.log(`Title: ${quiz.title}`);
        console.log(`Status: ${quiz.status}`);
        console.log(`Creator ID: ${quiz.creator_id}`);
        
        // Display settings
        if (quiz.settings) {
          console.log('Settings:', typeof quiz.settings === 'string' ? 
            'String (needs parsing)' : 'Object (already parsed)');
          
          try {
            const settings = typeof quiz.settings === 'string' ? 
              JSON.parse(quiz.settings) : quiz.settings;
              
            console.log('- Subject/Category:', settings.subject || settings.category || 'Not set');
            console.log('- Duration:', settings.duration || 'Not set');
            console.log('- Difficulty:', settings.difficulty || settings.complexity || 'Not set');
            console.log('- Access Code:', settings.accessCode || 'Not set');
          } catch (e) {
            console.log('❌ Error parsing settings:', e.message);
          }
        } else {
          console.log('Settings: Not available');
        }
      });
    }
    
    // Get quiz ID and user ID from command line args or use defaults
    const quizId = process.argv[2] || 10; // Default to quiz ID 10
    const userId = process.argv[3] || 1;  // Default to user ID 1
    
    console.log('\nRunning tests with Quiz ID', quizId, 'and User ID', userId);
    
    // Test direct Supabase access
    console.log('\n===== DIRECT SUPABASE ACCESS TESTS =====');
    const quizData = await getQuizById(quizId);
    
    if (quizData) {
      // Test updating settings
      const updatedQuiz = await updateQuizSettings(quizId, {
        accessCode: generateAccessCode(),
        category: "Test Subject",
        complexity: "medium",
        duration: 30,
        timeUnit: "minutes",
        publish: true // Special flag to publish in the same operation
      });
    }
    
    // Test DB API
    console.log('\n===== DB API TESTS =====');
    const dbQuiz = await testGetQuizViaDb(quizId, userId);
    
    if (dbQuiz) {
      // Only test publishing if the quiz isn't already published
      if (dbQuiz.status !== 'published') {
        await testPublishQuizViaDb(quizId, userId);
      } else {
        console.log(`Quiz ${quizId} is already published, skipping publish test`);
      }
    }
    
    console.log('\n===== TESTS COMPLETE =====');
  } else {
    console.log('❌ Supabase connection failed!');
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Test failed with error:', err);
});
