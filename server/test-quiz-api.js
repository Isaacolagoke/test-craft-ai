require('dotenv').config();
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

// Test client for the quiz generation API
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Create a test JWT token for authentication
function createTestToken() {
  const user = {
    id: 1,
    username: 'test_user',
    email: 'test@example.com'
  };
  
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

async function testQuizGenerationApi() {
  try {
    const token = createTestToken();
    console.log('Test token created');
    
    // Test with all supported question types
    const requestData = {
      topic: "Solar System",
      instructions: "Create questions about planets, moons, and space exploration",
      complexity: "intermediate",
      category: "Science",
      numberOfQuestions: 6,
      questionTypes: ['multiple_choice', 'true_false', 'matching']
    };
    
    console.log('Sending request to quiz generation API with data:', JSON.stringify(requestData, null, 2));
    
    const response = await fetch('http://localhost:3001/api/quizzes/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Quiz generated successfully');
      
      // Count question types
      const questions = responseData.quiz.questions;
      console.log(`Total questions generated: ${questions.length}`);
      
      const typeCounts = {};
      questions.forEach(q => {
        typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
      });
      
      console.log('Questions by type:', typeCounts);
      
      // Check if all question types are included
      const allTypesPresent = requestData.questionTypes.every(type => typeCounts[type] && typeCounts[type] > 0);
      
      if (allTypesPresent) {
        console.log('✅ SUCCESS: All requested question types were generated');
      } else {
        console.log('❌ FAILURE: Not all requested question types were generated');
        console.log('Missing types:', requestData.questionTypes.filter(type => !typeCounts[type]));
      }
      
      // Print one sample of each question type
      requestData.questionTypes.forEach(type => {
        const sampleQuestion = questions.find(q => q.type === type);
        if (sampleQuestion) {
          console.log(`\nSample ${type} question:`);
          console.log(JSON.stringify(sampleQuestion, null, 2));
        }
      });
    } else {
      console.log('❌ FAILURE: Quiz generation failed');
      console.log('Error:', responseData.error || 'Unknown error');
      if (responseData.details) {
        console.log('Details:', responseData.details);
      }
    }
  } catch (error) {
    console.error('❌ FAILURE: Error testing quiz generation API:', error);
  }
}

// Run the test
console.log('Starting quiz generation API test...');
testQuizGenerationApi()
  .then(() => console.log('Test completed!'))
  .catch(err => console.error('Test failed with error:', err));
