require('dotenv').config();
const db = require('./db/index');

// Test basic database functions
async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Check basic connection
    const { data, error } = await db.supabase.from('users').select('count');
    
    if (error) {
      console.error('❌ Supabase connection error:', error);
      process.exit(1);
    }
    
    console.log('✅ Successfully connected to Supabase!');
    
    // Test specific functions
    console.log('\nTesting database adapter functions...');
    
    // Create test user
    console.log('Creating test user...');
    const user = await db.insert('users', {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!',
      role: 'student'
    });
    console.log('✅ Created test user:', user.id);
    
    // Handle content/text field compatibility (based on known frontend/backend mismatch)
    const questionData = {
      type: 'multiple_choice',
      content: 'Test question content', // Frontend uses 'content'
      options: ['A', 'B', 'C'],
      correct_answer: 0
    };
    
    // Map 'content' to 'text' field for backend compatibility
    const mappedQuestion = {
      ...questionData,
      text: questionData.content // Map 'content' field to 'text' for backend
    };
    
    // Create test quiz
    console.log('Creating test quiz...');
    const quiz = await db.createQuiz(
      user.id,
      'Test Quiz',
      'A test quiz',
      JSON.stringify({
        timeLimit: 10,
        randomizeQuestions: true
      })
    );
    console.log('✅ Created test quiz:', quiz.id);
    
    // Create test question with proper field mapping
    console.log('Creating test question with field mapping...');
    const question = await db.createQuestion(
      quiz.id,
      mappedQuestion.type,
      mappedQuestion.text, // Using the mapped text field
      JSON.stringify(mappedQuestion.options),
      mappedQuestion.correct_answer
    );
    console.log('✅ Created test question:', question.id);
    
    // Clean up test data
    console.log('\nCleaning up test data...');
    await db.deleteQuiz(quiz.id);
    console.log('✅ Deleted test quiz');
    
    console.log('\n🎉 All tests passed! Your Supabase migration is ready to go.');
    console.log('\nNext steps:');
    console.log('1. Run the migration script: node server/migrate-to-supabase.js');
    console.log('2. Update your Render environment variables');
    console.log('3. Restart your server');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testSupabaseConnection();
