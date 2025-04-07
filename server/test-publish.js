require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://zorceesdshidcbxgnijy.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmNlZXNkc2hpZGNieGduaWp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTIyMjc3OTgsImV4cCI6MjAyNzgwMzc5OH0.J8TRf9I1Hm68yqKkRqfRjiMPnMZ-KOehVRQKEwG9V5g';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key available:', !!supabaseKey);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuizUpdate() {
  try {
    // 1. First test a simple query to get quizzes
    console.log('Testing quiz retrieval...');
    const { data: quizzes, error: getError } = await supabase
      .from('quizzes')
      .select('*')
      .limit(5);

    if (getError) {
      console.error('Error getting quizzes:', getError);
      return;
    }

    console.log(`Successfully retrieved ${quizzes.length} quizzes`);
    
    if (quizzes.length === 0) {
      console.log('No quizzes found to test with.');
      return;
    }

    // 2. Test updating a quiz status to draft (safe operation)
    const testQuizId = quizzes[0].id;
    console.log(`Testing quiz update for ID ${testQuizId}...`);
    
    // First retrieve the current quiz data
    const { data: currentQuiz, error: currentError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', testQuizId)
      .single();
      
    if (currentError) {
      console.error('Error getting current quiz:', currentError);
      return;
    }
    
    console.log('Current quiz data:', currentQuiz);
    
    // Create a settings object if it doesn't exist
    let settings = {};
    if (currentQuiz.settings) {
      if (typeof currentQuiz.settings === 'string') {
        try {
          settings = JSON.parse(currentQuiz.settings);
        } catch (e) {
          console.error('Error parsing settings:', e);
        }
      } else {
        settings = currentQuiz.settings;
      }
    }
    
    // Add a test access code
    settings.accessCode = 'TEST123';
    
    // 3. Perform the minimal update needed for publishing
    const updateData = {
      status: 'draft', // Safer to test with draft first
      settings: settings
    };
    
    console.log('Updating quiz with:', updateData);
    
    const { data: updatedQuiz, error: updateError } = await supabase
      .from('quizzes')
      .update(updateData)
      .eq('id', testQuizId)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating quiz:', updateError);
      return;
    }
    
    console.log('Successfully updated quiz:', updatedQuiz);
    
    // 4. Test publishing the quiz
    const publishData = {
      status: 'published',
      published_at: new Date().toISOString(),
      settings: settings
    };
    
    console.log('Publishing quiz with:', publishData);
    
    const { data: publishedQuiz, error: publishError } = await supabase
      .from('quizzes')
      .update(publishData)
      .eq('id', testQuizId)
      .select()
      .single();
      
    if (publishError) {
      console.error('Error publishing quiz:', publishError);
      return;
    }
    
    console.log('Successfully published quiz:', publishedQuiz);
    
  } catch (e) {
    console.error('Unexpected error during test:', e);
  }
}

// Run the test
testQuizUpdate()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed:', err));
