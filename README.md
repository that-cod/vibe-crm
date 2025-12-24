# VibeCRM - AI-Powered CRM Builder

Build production-ready, customized CRMs in minutes using natural language prompts.

## Features

- 🚀 **AI-Powered Generation**: Describe your needs, get a complete CRM
- 🏗️ **Smart Schema Design**: Automatically generates optimized PostgreSQL schemas
- 🎨 **Production-Ready UI**: Built with Refine.dev and Ant Design
- 🔐 **Secure Authentication**: Google OAuth via NextAuth.js
- 🗄️ **Multi-Tenant Architecture**: Each user's CRM in isolated PostgreSQL schemas
- ⚡ **Lightning Fast**: From prompt to deployed CRM in under 2 minutes

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **AI**: Claude 3.5 Sonnet (Anthropic)
- **CRM Framework**: Refine.dev + Ant Design
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS + shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google Cloud Console account (for OAuth)
- Anthropic API key (for Claude)

### 1. Clone and Install

```bash
cd "vibe-crm-app"
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in all the values:

#### Database (Supabase)
1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to Project Settings → Database
3. Copy the connection string and add to `.env`:
   ```
   DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"
   DIRECT_URL="postgresql://postgres:[password]@[host]:5432/postgres"
   ```
4. Copy Project URL and anon key:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Secret to `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

#### NextAuth
Generate a secret:
```bash
openssl rand -base64 32
```
Add to `.env`:
```
NEXTAUTH_SECRET=your_generated_secret
NEXTAUTH_URL=http://localhost:3000
```

#### Anthropic API (Claude)
1. Sign up at [Anthropic](https://www.anthropic.com)
2. Get your API key from the dashboard
3. Add to `.env`:
   ```
   ANTHROPIC_API_KEY=your_api_key
   ```

### 3. Setup Supabase Function (for SQL execution)

In your Supabase project, go to SQL Editor and run:

```sql
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;
```

This allows the app to create schemas and tables programmatically.

### 4. Setup Database

Run Prisma migrations:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Sign In**: Click "Sign in with Google" on the landing page
2. **Onboarding**: Fill in your business details
3. **Create CRM**: On the dashboard, describe your CRM needs:
   > "Create a CRM for my real estate agency with properties, clients, showings, and agent commission tracking"
4. **Generate**: Click "Generate CRM" and wait ~30-60 seconds
5. **Preview**: View your generated schema, SQL, and application code
6. **Download**: Download the generated code files

## Example Prompts

- "Build a customer support CRM with tickets, customers, knowledge base, and SLA tracking"
- "Create a recruitment CRM with candidates, jobs, interviews, and hiring pipeline"
- "I need a CRM for my cleaning business to manage clients, appointments, teams, and invoices"

## Project Structure

```
vibe-crm-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/    # Authentication
│   │   │   ├── onboarding/            # Save business profile
│   │   │   ├── generate-crm/          # Main CRM generation
│   │   │   └── projects/[id]/         # Fetch project
│   │   ├── dashboard/
│   │   │   ├── page.tsx               # Main prompt interface
│   │   │   └── preview/[id]/          # View generated CRM
│   │   ├── onboarding/
│   │   │   └── page.tsx               # Business details form
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Landing page
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   └── providers.tsx              # SessionProvider
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── orchestrator.ts        # Prompt → CRM Spec
│   │   │   ├── schema-generator.ts    # CRM Spec → SQL
│   │   │   └── code-generator.ts      # CRM Spec → Refine.dev
│   │   ├── auth.ts                    # NextAuth config
│   │   ├── prisma.ts                  # Prisma client
│   │   └── supabase.ts                # Supabase admin client
│   └── types/
│       └── next-auth.d.ts             # Type extensions
├── prisma/
│   └── schema.prisma                  # Database schema
└── package.json
```

## Architecture

### Multi-Tenant Database Design
Each user's CRM data is isolated in a separate PostgreSQL schema:
- User 123's CRM → Schema: `user_abc123_crm`
- User 456's CRM → Schema: `user_def456_crm`

This provides strong data isolation while using a single Supabase project.

### CRM Generation Flow
1. **Orchestrator** (Claude) → Parses prompt into structured CRM specification
2. **Schema Generator** → Converts spec to PostgreSQL DDL
3. **Database Provisioner** → Creates schema and executes SQL  
4. **Code Generator** (Claude) → Writes Refine.dev application code
5. **Storage** → Saves project to database with status "completed"

## Troubleshooting

### Database Connection Issues
- Ensure Supabase project is running and accessible
- Check DATABASE_URL format is correct
- Verify Supabase service role key has proper permissions

### Authentication Errors
- Verify Google OAuth redirect URI matches exactly
- Ensure NEXTAUTH_SECRET is set and random
- Check Google Cloud Console credentials are active

### AI Generation Failures
- Verify Anthropic API key is valid and has credits
- Check prompt is at least 20 characters
- Review network connectivity to Anthropic API

## Development

### Run Prisma Studio
```bash
npx prisma studio
```

### View Logs
```bash
npm run dev
# Check terminal for detailed logs during CRM generation
```

### Reset Database
```bash
npx prisma migrate reset
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
