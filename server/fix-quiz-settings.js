/**
 * Script to fix all quiz settings in the database
 * This ensures all quizzes have properly formatted settings with the right fields
 */

require('dotenv').config();
const { supabase } = require('./db/index');

async function fixQuizSettings() {
  try {
    console.log('Initializing quiz settings fix script...');
    
    // Get all quizzes
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*');
      
    if (error) {
      throw error;
    }
    
    console.log(`Found ${quizzes.length} quizzes to process`);
    
    // Process each quiz
    for (const quiz of quizzes) {
      console.log(`\nProcessing quiz ID ${quiz.id}: ${quiz.title}`);
      
      // Extract current settings
      let settings;
      try {
        if (typeof quiz.settings === 'string') {
          settings = JSON.parse(quiz.settings);
          console.log('- Parsed settings from string');
        } else if (quiz.settings) {
          settings = quiz.settings;
          console.log('- Using existing settings object');
        } else {
          settings = {};
          console.log('- No settings found, creating new object');
        }
      } catch (e) {
        console.log('- Error parsing settings, creating new object');
        settings = {};
      }
      
      // Current values for logging
      console.log('Current settings:');
      console.log('- Subject/Category:', settings.subject || settings.category || 'Not set');
      console.log('- Duration:', settings.duration || 'Not set');
      console.log('- Difficulty:', settings.difficulty || settings.complexity || 'Not set');
      console.log('- Access Code:', settings.accessCode || 'Not set');
      
      // Standardize difficulty value mapping
      let standardizedDifficulty = 'Medium'; // default
      if (settings.difficulty || settings.complexity) {
        const currentDifficulty = (settings.difficulty || settings.complexity || '').toLowerCase();
        if (currentDifficulty.includes('easy') || currentDifficulty.includes('beginner')) {
          standardizedDifficulty = 'Easy';
        } else if (currentDifficulty.includes('hard') || currentDifficulty.includes('advanced')) {
          standardizedDifficulty = 'Hard';
        } else if (currentDifficulty.includes('med') || currentDifficulty.includes('inter')) {
          standardizedDifficulty = 'Medium';
        }
      }
      
      // Create updated settings with all required fields
      const updatedSettings = {
        // Preserve the access code
        accessCode: settings.accessCode || generateAccessCode(),
        
        // Standardize the field names and ensure we have values
        subject: settings.subject || settings.category || 'General',
        category: settings.category || settings.subject || 'General',
        duration: settings.duration || settings.timeLimit || 10,
        timeUnit: settings.timeUnit || 'minutes',
        difficulty: standardizedDifficulty,
        
        // Preserve any other existing settings
        ...settings,
        
        // Make sure these standardized values override any existing ones
        difficulty: standardizedDifficulty
      };
      
      // Update the quiz
      const { data, updateError } = await supabase
        .from('quizzes')
        .update({ settings: updatedSettings })
        .eq('id', quiz.id)
        .select()
        .single();
        
      if (updateError) {
        console.log(`- ❌ Error updating quiz ${quiz.id}:`, updateError);
      } else {
        console.log(`- ✅ Successfully updated quiz ${quiz.id}`);
        console.log('Updated settings:');
        console.log('- Subject/Category:', updatedSettings.subject);
        console.log('- Duration:', updatedSettings.duration, updatedSettings.timeUnit);
        console.log('- Difficulty:', updatedSettings.difficulty);
        console.log('- Access Code:', updatedSettings.accessCode);
      }
    }
    
    console.log('\n✅ All quizzes processed');
    
  } catch (error) {
    console.error('Error in fix script:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Generate a random access code for quizzes that don't have one
function generateAccessCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Run the script
fixQuizSettings();
