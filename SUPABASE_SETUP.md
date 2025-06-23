# PaperPulse v2.0 Supabase Setup Guide

## 🚀 Quick Start with Supabase

PaperPulse v2.0 uses Supabase for authentication and database management. Follow this guide to set up your Supabase project.

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Choose your organization
5. Set project name: `paperpulse-v2`
6. Set database password (save this!)
7. Choose a region close to your users
8. Click "Create new project"

### 2. Get Your Project Credentials

Once your project is created:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Anon (public) key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this secret!)

### 3. Set Up Environment Variables

Create a `.env.local` file in the `web/` directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: For server-side operations
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Next.js Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Run the Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `web/supabase/schema.sql`
3. Paste it into the SQL editor
4. Click "Run"

This will create all the necessary tables, policies, and triggers.

### 5. Configure Authentication

#### Enable Email Authentication

1. Go to **Authentication** → **Settings**
2. Under **Auth Providers**, enable **Email**
3. Configure email templates (optional)

#### Enable Google OAuth (Optional)

1. Go to **Authentication** → **Settings**
2. Under **Auth Providers**, enable **Google**
3. Add your Google OAuth credentials:
   - **Client ID**: Your Google Client ID
   - **Client Secret**: Your Google Client Secret

To get Google OAuth credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for development)

### 6. Configure Row Level Security (RLS)

The schema automatically sets up RLS policies, but verify they're working:

1. Go to **Authentication** → **Policies**
2. You should see policies for:
   - `users` table
   - `subscriptions` table
   - `user_papers` table
   - `papers` table (public read)
   - `digest_history` table (public read)

### 7. Test the Setup

1. Start your Next.js development server:
   ```bash
   cd web
   npm run dev
   ```

2. Visit `http://localhost:3000`
3. Try signing up with email or Google
4. Check the Supabase **Authentication** → **Users** tab to see if the user was created
5. Check the **Table Editor** to see if a user record and default subscription were created

### 8. Production Setup

For production deployment:

1. Update your `.env.local` with production URLs
2. Add your production domain to Supabase **Authentication** → **Settings** → **Site URL**
3. Add production redirect URLs to Google OAuth (if using)
4. Set up proper email configuration for auth emails

## 🗄️ Database Schema Overview

The database includes these main tables:

- **users**: User profiles (extends Supabase auth.users)
- **subscriptions**: User preferences and keywords
- **papers**: Research papers from arXiv
- **user_papers**: User interactions (bookmarks, ratings)
- **digest_history**: Daily digest archives

## 🔐 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Service Role Protection**: Only the backend can manage papers and digests
- **Email Verification**: Required for new accounts
- **OAuth Integration**: Secure Google sign-in

## 🛠️ Development Tips

### Useful Supabase CLI Commands

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Generate TypeScript types
supabase gen types typescript --project-id your-project-ref > types/supabase.ts
```

### Database Migrations

For schema changes:

1. Make changes in Supabase dashboard
2. Generate migration:
   ```bash
   supabase db diff --file migration_name
   ```
3. Apply migration:
   ```bash
   supabase db push
   ```

### Local Development

You can run Supabase locally:

```bash
supabase start
supabase db reset
```

## 📧 Email Configuration

For email authentication, you'll need an SMTP server. Options:

1. **Gmail**: Use App Passwords with 2FA enabled
2. **SendGrid**: Professional email service
3. **Resend**: Modern email API (recommended)

Add to your `.env.local`:

```bash
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your_email@gmail.com
EMAIL_SERVER_PASSWORD=your_app_password
EMAIL_FROM=noreply@paperpulse.ai
```

## 🚨 Troubleshooting

### Common Issues

1. **"Invalid JWT" errors**: Check your environment variables
2. **RLS policy violations**: Ensure policies are set up correctly
3. **Email auth not working**: Verify SMTP configuration
4. **Google OAuth fails**: Check redirect URIs and credentials

### Debug Commands

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL

# Test Supabase connection
supabase projects list

# View real-time logs
supabase logs --level=info
```

## 🎯 Next Steps

Once Supabase is set up:

1. **Test Authentication**: Sign up/in with email and Google
2. **Verify Database**: Check that user data is being created
3. **Run the Agent**: Update the Python agent to use Supabase
4. **Deploy**: Deploy both web app and agent to production

Your PaperPulse v2.0 is now ready with a powerful authentication system and scalable database! 