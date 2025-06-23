# 🚀 Deploy Debug Version

## Quick Steps to Update Your Vercel App

Since we've added debugging logs to both the client and server, here's how to deploy them:

### Option 1: Use Vercel CLI (Recommended)
```bash
cd web
npx vercel --prod
```

### Option 2: Manual Upload via Vercel Dashboard
1. **Zip your entire `web` folder**
2. Go to [vercel.com/new](https://vercel.com/new)
3. **Upload the zip file**
4. Deploy to your existing project

### Option 3: GitHub Integration (Best Long-term)
1. **Create a GitHub repository**
2. **Push your code to GitHub**
3. **Connect Vercel to your GitHub repo**
4. **Auto-deploy on every push**

## 🔍 After Deployment

1. **Open two browser tabs:**
   - Tab 1: Your Vercel app
   - Tab 2: Vercel Runtime Logs

2. **Try subscribing with debugging:**
   - Fill in email and keywords
   - **Open browser console** (F12 → Console tab)
   - Click "Subscribe for Free"
   - **Watch both console and Vercel logs**

## 🕵️ What to Look For

### In Browser Console:
```
🔍 Form submission started {email: "test@example.com", keywords: "AI, ML"}
📤 Sending request to /api/subscribe {...}
📥 Response received {status: 200, statusText: "OK", ok: true}
✅ Subscription successful {...}
```

### In Vercel Runtime Logs:
```
🔍 Email debugging info: {resendApiKey: 'Present', fromEmail: 'onboarding@resend.dev'}
🔍 Checking email providers... {resendKey: 'Present', ...}
✅ Using Resend provider
📧 Attempting to send email via Resend
✅ Welcome email sent via Resend to test@example.com
```

## 🚨 Troubleshooting Scenarios

**If browser console shows network error:**
→ API route not deployed or URL issue

**If browser console shows 404:**
→ API route missing from deployment

**If browser console shows 500:**
→ Server error (check Vercel logs)

**If Vercel logs show "Console" provider:**
→ Environment variables not set correctly

**If Vercel logs show "Present" but email fails:**
→ Resend API issue (check API key validity)

---

**Deploy the debug version and try subscribing again!** 