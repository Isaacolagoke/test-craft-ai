const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_KEY environment variables.');
}

const supabase = createClient(
  supabaseUrl || 'https://your-project-url.supabase.co',
  supabaseKey || 'your-public-anon-key'
);

module.exports = supabase;
