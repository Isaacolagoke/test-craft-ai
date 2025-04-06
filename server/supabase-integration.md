# Supabase Integration Guide for TestCraft

This guide explains how to complete the migration from SQLite to Supabase for your TestCraft quiz application.

## Steps to Complete Migration

### 1. Set Up Your Supabase Project & Tables

1. Visit [Supabase](https://supabase.com) and sign in or create an account
2. Create a new project (name: "testcraft")
3. Once your project is created, go to the SQL Editor
4. Paste the contents of `server/db/schema.sql` into the editor and run it to create your tables

### 2. Get Your Supabase Credentials

1. In your Supabase project, go to Project Settings > API
2. Copy the "Project URL" - this will be your `SUPABASE_URL`
3. Copy the "anon public" key - this will be your `SUPABASE_KEY`
4. Add these to your `.env` file and to your production environment variables in Render

### 3. Switch to the Supabase Implementation

After setting up your Supabase tables and getting your credentials, you need to:

1. Update your environment variables
```
SUPABASE_URL=https://your-project-url.supabase.co
SUPABASE_KEY=your-anon-key-here
```

2. Migrate your existing data (if needed):
```bash
node server/db/migrate.js
```

3. Update the main server file to use the new database adapter

### 4. Update Render Deployment

1. Add the Supabase credentials as environment variables in your Render dashboard
2. Redeploy your application

## Files Modified During Migration

- `/server/db/` - New directory with Supabase adapter code
- `/server/db/index.js` - New database adapter
- `/server/db/supabase.js` - Supabase client configuration
- `/server/db/schema.sql` - PostgreSQL schema for Supabase
- `/server/db/migrate.js` - Data migration script
- `/server/routes/auth.supabase.js` - Updated authentication routes

## Testing After Migration

After migrating, test the following features to ensure everything is working:

1. User registration
2. User login
3. Creating a quiz
4. Taking a quiz
5. Viewing quiz submissions

If any features don't work as expected, check the server logs for errors related to database operations.

## Notes About the Changes

1. The database adapter now uses table names directly (`users`, `quizzes`, etc.) rather than SQL queries
2. JSON data is now stored in native JSONB columns rather than as stringified JSON
3. Better indexing has been added for improved performance
4. Primary keys use PostgreSQL's SERIAL type instead of SQLite's INTEGER PRIMARY KEY AUTOINCREMENT
