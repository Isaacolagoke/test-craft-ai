const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://zorceesdshidcbxgnijy.supabase.co';
// We need to use a valid anon key for this project
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmNlZXNkc2hpZGNieGduaWp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTIyMjc3OTgsImV4cCI6MjAyNzgwMzc5OH0.J8TRf9I1Hm68yqKkRqfRjiMPnMZ-KOehVRQKEwG9V5g';

if (!supabaseUrl) {
  console.error('Supabase URL missing. Please set SUPABASE_URL environment variable.');
}

console.log('Initializing Supabase with URL:', supabaseUrl);
console.log('Supabase key status:', supabaseKey ? 'Available' : 'Missing');

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

module.exports = supabase;
