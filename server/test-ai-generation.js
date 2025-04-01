require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Test script to validate AI quiz generation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log('GEMINI_API_KEY present:', !!GEMINI_API_KEY);

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

// Create a new instance of GoogleGenerativeAI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Helper function to safely generate content with error handling and retries
async function safeGenerateContent(model, prompt, maxRetries = 2) {
  let attempts = 0;
  let lastError = null;

  while (attempts <= maxRetries) {
    try {
      console.log(`Attempt ${attempts + 1} to generate content`);
      // Use the direct prompt method for version 0.2.1
      const result = await model.generateContent(prompt);
      console.log('Generation successful');
      return result;
    } catch (error) {
      console.error(`Generation attempt ${attempts + 1} failed:`, error);
      lastError = error;
      attempts++;
      
      // Wait before retrying (exponential backoff)
      if (attempts <= maxRetries) {
        const delay = 1000 * Math.pow(2, attempts);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we get here, all attempts failed
  throw new Error(`Failed to generate content after ${maxRetries + 1} attempts: ${lastError.message}`);
}

// Helper function to extract JSON from markdown-formatted text
function extractJsonFromMarkdown(text) {
  if (!text) {
    throw new Error('Empty response from AI');
  }

  try {
    // First try to find content between ```json and ```
    let jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    
    // If not found, try between ``` and ```
    if (!jsonMatch) {
      jsonMatch = text.match(/```\n([\s\S]*?)\n```/);
    }
    
    // If still not found, try to parse the entire text as JSON
    if (!jsonMatch) {
      try {
        return JSON.parse(text.trim());
      } catch (e) {
        console.error('Failed to parse entire text as JSON:', e);
        throw new Error('No valid JSON found in the response');
      }
    }

    const jsonContent = jsonMatch[1].trim();
    
    // Clean up any trailing commas that might cause JSON.parse to fail
    const cleanedJson = jsonContent.replace(/,(\s*[}\]])/g, '$1');
    
    try {
      return JSON.parse(cleanedJson);
    } catch (e) {
      console.error('Failed to parse extracted JSON:', e);
      console.error('JSON content:', jsonContent);
      throw new Error('Invalid JSON format in the response');
    }
  } catch (err) {
    console.error('Error extracting JSON:', err);
    throw new Error('Failed to extract valid JSON from the response');
  }
}

async function testAIGeneration() {
  try {
    // Get the model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",  // Updated to the correct model name
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    // Test with all supported question types
    const topic = "Solar System";
    const instructions = "Create questions about planets, moons, and space exploration";
    const complexity = "intermediate";
    const category = "Science";
    const numberOfQuestions = 6;
    const safeQuestionTypes = ['multiple_choice', 'true_false', 'matching'];
    
    // Create distribution of question types - ensure we have at least one of each type
    const distribution = {
      'multiple_choice': 2,
      'true_false': 2,
      'matching': 2
    };
    
    console.log('Question distribution:', distribution);
    
    // Create the prompt
    const prompt = `You are a professional quiz creator with expertise in ${category}. Create a quiz on the topic of "${topic}" with ${numberOfQuestions} questions of varying difficulty levels.

Additional Instructions: ${instructions || "Make sure questions are clear and concise."}

The quiz should have the following structure and question types:
${Object.entries(distribution).map(([type, count]) => `- ${count} ${type} questions`).join('\n')}

Please provide the quiz in the following JSON format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "text": "Question text goes here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0, // Index of the correct option
      "explanation": "Explanation for the correct answer"
    },
    {
      "type": "true_false",
      "text": "True/False question text goes here",
      "options": ["True", "False"],
      "correctAnswer": 0, // 0 for True, 1 for False
      "explanation": "Explanation for the correct answer"
    },
    {
      "type": "matching",
      "text": "Match the items on the left with those on the right",
      "options": [
        {"left": "Item 1", "right": "Match 1"},
        {"left": "Item 2", "right": "Match 2"},
        {"left": "Item 3", "right": "Match 3"}
      ],
      "correctAnswer": [0, 1, 2], // Indices showing the correct matches (Item 1 -> Match 1, etc.)
      "explanation": "Explanation for the correct matches"
    }
  ]
}

IMPORTANT: STRICTLY follow the distribution of question types I specified. The total number of questions must be exactly ${numberOfQuestions}, with the exact counts for each type as I specified.`;

    console.log('Sending prompt to Gemini...');
    const result = await safeGenerateContent(model, prompt);
    console.log('Generation completed');
    
    if (!result || !result.response) {
      throw new Error('Empty response from Gemini API');
    }
    
    // Extract the response text
    const responseText = result.response.text();
    console.log('Raw response length:', responseText.length);
    console.log('Response snippet:', responseText.substring(0, 200) + '...');

    // Try to parse the response as JSON
    let formattedQuestions;
    try {
      formattedQuestions = JSON.parse(responseText.trim());
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      // Try to extract JSON from markdown
      formattedQuestions = extractJsonFromMarkdown(responseText);
    }

    if (!formattedQuestions || !formattedQuestions.questions) {
      throw new Error('Invalid response format from AI');
    }
    
    console.log('Successfully parsed response!');
    console.log('Questions generated:', formattedQuestions.questions.length);
    
    // Count the question types in the response
    const typeCounts = {};
    formattedQuestions.questions.forEach(q => {
      typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
    });
    
    console.log('Questions by type:', typeCounts);
    
    // Check if all question types are present
    let allTypesPresent = true;
    Object.entries(distribution).forEach(([type, count]) => {
      if (!typeCounts[type] || typeCounts[type] < count) {
        console.error(`Missing ${type} questions. Expected ${count}, got ${typeCounts[type] || 0}`);
        allTypesPresent = false;
      }
    });
    
    if (allTypesPresent) {
      console.log('✅ SUCCESS: All question types were generated correctly!');
    } else {
      console.log('❌ FAILURE: Some question types are missing!');
    }
    
    // Print the first question of each type for inspection
    safeQuestionTypes.forEach(type => {
      const question = formattedQuestions.questions.find(q => q.type === type);
      if (question) {
        console.log(`\nSample ${type} question:`);
        console.log(JSON.stringify(question, null, 2));
      }
    });
    
  } catch (error) {
    console.error('❌ FAILURE: Error testing AI generation:', error);
  }
}

// Run the test
console.log('Starting AI generation test...');
testAIGeneration()
  .then(() => console.log('Test completed!'))
  .catch(err => console.error('Test failed with error:', err));
