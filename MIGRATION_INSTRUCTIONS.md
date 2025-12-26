# Manual Database Migration Instructions

## Why Manual Migration?

The automatic Prisma migration is timing out when connecting to Supabase's connection pooler. This is a common issue when using Supabase's pooler (port 6543) for migrations, which require direct database connections.

## Steps to Run the Migration

### Option 1: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your VibeCRM project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Run the Migration**
   - Open the migration file: [`prisma/migrations/manual_add_multi_provider_auth.sql`](file:///Users/maheshyadav/Desktop/Vibe%20CRM%20/vibe-crm-app/prisma/migrations/manual_add_multi_provider_auth.sql)
   - Copy the entire SQL content
   - Paste it into the SQL Editor
   - Click "Run" or press `Cmd+Enter`

4. **Verify Results**
   - The query will show the current schema of the `users` table
   - You should see three columns: `password`, `githubId`, and `googleId`
   - All three should be `TEXT` type and nullable

### Option 2: Using Direct Connection URL

If you prefer using Prisma CLI:

1. **Get Direct Connection URL**
   - In Supabase Dashboard → Settings → Database
   - Under "Connection string" section, find "Direct connection"
   - Copy the connection string (uses port 5432, not 6543)

2. **Temporarily Update .env**
   ```bash
   # Backup your current DATABASE_URL
   cp .env .env.backup
   
   # Update DATABASE_URL to use direct connection
   # Replace the pooler URL (port 6543) with direct URL (port 5432)
   ```

3. **Run Migration**
   ```bash
   npx prisma migrate dev --name add_multi_provider_auth
   ```

4. **Restore Original .env**
   ```bash
   mv .env.backup .env
   ```

## What This Migration Does

✅ Adds `password` column (TEXT, nullable) - For email/password authentication  
✅ Adds `githubId` column (TEXT, nullable, unique) - For GitHub OAuth  
✅ Creates unique constraint on `githubId` - Prevents duplicate GitHub accounts  
✅ Verifies existing `googleId` column - Confirms Google OAuth support intact

## After Running Migration

Once the migration succeeds:

1. **Update Prisma Client** (if needed)
   ```bash
   npx prisma generate
   ```

2. **Restart Dev Server**
   ```bash
   # Press Ctrl+C in terminal where npm run dev is running
   npm run dev
   ```

3. **Test Authentication**
   - Visit http://localhost:3000
   - Try email/password sign-up
   - Verify Google OAuth still works
   - (GitHub OAuth requires additional setup - see walkthrough.md)

## Verification

After migration, you can verify the changes:

```sql
-- Run this query in Supabase SQL Editor
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY column_name;
```

Expected columns in `users` table:
- `createdAt` - timestamp
- `email` - text
- `emailVerified` - timestamp
- `githubId` - text (NEW)
- `googleId` - text
- `id` - text
- `image` - text
- `name` - text
- `password` - text (NEW)
- `updatedAt` - timestamp

## Troubleshooting

**Error: "relation 'users' does not exist"**
- Your table might be named differently or in a different schema
- Check your actual table name in Supabase Table Editor

**Error: "column already exists"**
- The migration script uses `ADD COLUMN IF NOT EXISTS`
- This is safe to run multiple times

**Error: "permission denied"**
- Make sure you're using the correct database credentials
- You need admin/owner access to alter tables

## Need Help?

If you encounter any issues, check:
1. Supabase project is active and accessible
2. You have correct permissions
3. The `users` table exists in the `public` schema
4. No other migrations are pending
