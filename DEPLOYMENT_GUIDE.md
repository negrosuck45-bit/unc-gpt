# UNCGPT Vercel Deployment Guide

## Quick Start

### Option 1: Deploy from Git (Recommended)

1. **Initialize git repo** (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. **Push to GitHub, GitLab, or Bitbucket**:
   - Create a new repo on GitHub
   - Push your code: `git push origin main`

3. **Connect to Vercel**:
   - Go to https://vercel.com/dashboard
   - Click "New Project"
   - Import your git repo
   - Follow the setup wizard

4. **Configure Environment Variables**:
   In Vercel dashboard, go to **Settings > Environment Variables** and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OAUTH_REDIRECT_BASE_URL=https://your-app.vercel.app
   ```
   
   Add any other provider keys you're using (Groq, Cloudflare, etc.)

5. **Redeploy**:
   - After adding env vars, rerun the deployment
   - Vercel will automatically rebuild with the new variables

### Option 2: Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# For production:
vercel --prod

# Link project (if deploying to existing Vercel project):
vercel link
```

## Fixing the "Vercel Blob: Access denied" Error

This error occurs when Vercel's build system tries to access Blob storage but doesn't have a token. Here's how to fix it:

### Root Causes:
1. **Missing Environment Variables** - Required env vars not set during build
2. **Build Configuration** - Next.js trying to access Blob during build time

### Solutions:

#### Solution 1: Set All Required Environment Variables
Make sure these are set in Vercel's Environment Variables dashboard:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OAUTH_REDIRECT_BASE_URL
NODE_ENV=production
```

#### Solution 2: Update next.config.mjs
Check and update your `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
```

#### Solution 3: Verify Build Command
Ensure your `package.json` build script is correct:
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev"
  }
}
```

#### Solution 4: Check for Blob Usage
Search your code for any Blob-related imports:
```bash
grep -r "@vercel/blob" .
grep -r "blob" app/api
```

If found, ensure you have `VERCEL_BLOB_READ_WRITE_TOKEN` set (though this app doesn't use it).

## Environment Variables Reference

### Required for Deployment:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (secret)
- `OAUTH_REDIRECT_BASE_URL` - Your deployed app URL (e.g., https://myapp.vercel.app)

### Optional - AI Providers:
- `GROQ_API_KEY` - For Groq model access
- `CLOUDFLARE_API_TOKEN` - For Cloudflare Workers AI
- `CLOUDFLARE_ACCOUNT_ID` - For Cloudflare Workers AI
- `CLAUDE_API_KEY` - For Claude API access

### Optional - OAuth Providers:
- `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`
- `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`
- `VERCEL_CLIENT_ID`, `VERCEL_CLIENT_SECRET`

## Troubleshooting

### Build Fails with "Access denied" Error
1. Check Vercel build logs for the exact error
2. Verify all environment variables are set correctly
3. Ensure no `.env.local` file is being committed to git
4. Clear Vercel cache: **Settings > Deployments > Clear Cache**

### App Works Locally but Not on Vercel
1. Environment variables might be missing
2. Public vs private env var mismatch (NEXT_PUBLIC_ prefix)
3. API keys might be expired

### Can't Connect to Supabase
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the anonymous key, not service role
3. Verify your Supabase project is active

## Deployment Checklist

- [ ] Git repo initialized and code committed
- [ ] Git repo pushed to GitHub/GitLab/Bitbucket
- [ ] Vercel project created and connected to git repo
- [ ] Environment variables added to Vercel dashboard
- [ ] Deployment triggered (automatic or manual)
- [ ] Visit deployment URL to verify it works
- [ ] Test chat functionality
- [ ] Test file uploads if applicable
- [ ] Check browser console for errors (F12 > Console tab)

## After Deployment

### Custom Domain
1. In Vercel dashboard, go to **Settings > Domains**
2. Add your custom domain
3. Update DNS records as instructed

### Monitoring
- Check Vercel Analytics dashboard
- Monitor API usage and errors
- Review build logs for warnings

### Updates
To deploy new changes:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```
Vercel will automatically rebuild and deploy.

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs
- Check Vercel build logs for specific error messages
