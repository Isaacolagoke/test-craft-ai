-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  settings JSONB,  -- Changed from TEXT to JSONB for better JSON handling
  image_url TEXT,
  is_accepting_responses BOOLEAN DEFAULT TRUE, -- Changed from INTEGER to BOOLEAN
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  text TEXT NOT NULL,      -- Note: Frontend uses 'content' field which maps to this 'text' field
  options JSONB,           -- Changed from TEXT to JSONB for better JSON handling
  correct_answer INTEGER,  
  explanation TEXT,
  media_url TEXT,          -- Added for question images
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Responses table
CREATE TABLE IF NOT EXISTS responses (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id),
  user_id INTEGER REFERENCES users(id),
  respondent_info JSONB,   -- Added for anonymous respondent information
  answers JSONB,           -- Changed from TEXT to JSONB
  score REAL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_creator ON quizzes(creator_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_responses_quiz ON responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_responses_user ON responses(user_id);
