require('dotenv').config();
const { migrateData } = require('./db/migrate');

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('\n⚠️  Missing Supabase credentials in environment variables!');
  console.error('Make sure SUPABASE_URL and SUPABASE_KEY are set in your .env file\n');
  process.exit(1);
}

console.log('\n🚀 Starting migration from SQLite to Supabase...\n');

// Run the migration
migrateData()
  .then(() => {
    console.log('\n✅ Migration completed successfully! Your data is now in Supabase.');
    console.log('\nNext steps:');
    console.log('1. Update your Render environment variables to include:');
    console.log('   - SUPABASE_URL');
    console.log('   - SUPABASE_KEY');
    console.log('\n2. Restart your server to use the new database');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Migration failed:', err);
    console.error('\nPlease fix the errors and try again.');
    process.exit(1);
  });
