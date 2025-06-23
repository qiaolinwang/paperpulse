# 🚀 Vercel Environment Variables Setup

## Step-by-Step Guide to Add Your API Keys

### 1. 📍 Find Your Vercel Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Look for your **PaperPulse** project
3. **Click on the project** to open it

### 2. ⚙️ Navigate to Settings

1. Click on the **"Settings"** tab (in the top navigation bar)
2. In the left sidebar, click **"Environment Variables"**

### 3. ➕ Add Environment Variables

You need to add **3 environment variables**. For each one:

1. Click **"Add New"** button
2. Fill in the **Name** and **Value**
3. Select **"Production, Preview, and Development"**
4. Click **"Save"**

#### Variable 1: Resend API Key
```
Name: RESEND_API_KEY
Value: re_8W3QKNJM_C8TB5ZBsTnYdJuBkBgqDwCtG
Environment: Production, Preview, and Development
```

#### Variable 2: From Email Address
```
Name: FROM_EMAIL
Value: onboarding@resend.dev
Environment: Production, Preview, and Development
```

#### Variable 3: Your App URL
```
Name: NEXT_PUBLIC_BASE_URL
Value: https://your-paperpulse-app.vercel.app
Environment: Production, Preview, and Development
```

**⚠️ Important:** Replace `your-paperpulse-app.vercel.app` with your actual Vercel app URL.

### 4. 🔄 Redeploy Your App

After adding all variables:

1. Go to the **"Deployments"** tab
2. Find your latest deployment
3. Click the **three dots (⋯)** next to it
4. Click **"Redeploy"**
5. Wait for the deployment to complete (usually 1-2 minutes)

### 5. ✅ Test Your Setup

Once redeployed:

1. Visit your live Vercel app URL
2. Try the subscription form
3. Check that you receive a welcome email

## 🎯 Your Configuration Summary

After setup, your environment variables should look like this:

```bash
RESEND_API_KEY=re_8W3QKNJM_C8TB5ZBsTnYdJuBkBgqDwCtG
FROM_EMAIL=onboarding@resend.dev
NEXT_PUBLIC_BASE_URL=https://your-actual-app-url.vercel.app
```

## 🚨 Troubleshooting

### If emails aren't sending:

1. **Check Vercel function logs:**
   - Go to "Functions" tab in Vercel
   - Click on your API route
   - Check the logs for errors

2. **Verify your Resend account:**
   - Make sure your Resend account is verified
   - Check your Resend dashboard for any restrictions

3. **Test with a simple email:**
   - Use your own email address first
   - Check spam folder

### Common Issues:

❌ **"API key not found"** → Variable name typo in Vercel
❌ **"Unauthorized"** → API key is incorrect or account not verified
❌ **"Domain not verified"** → Use `onboarding@resend.dev` for testing

## 🎉 Success!

Once configured, your PaperPulse app will:
- ✅ Send welcome emails when users subscribe
- ✅ Send confirmation emails when users unsubscribe
- ✅ Store subscriber data in your JSON file
- ✅ Support up to 3,000 free emails per month with Resend

## 🔗 Useful Links

- [Your Vercel Dashboard](https://vercel.com/dashboard)
- [Resend Dashboard](https://resend.com/dashboard)
- [Resend Documentation](https://resend.com/docs)

---

**Need help?** The environment variables are the most critical part - once they're set correctly, everything should work perfectly! 