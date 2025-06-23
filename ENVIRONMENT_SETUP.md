# PaperPulse Environment Variables Setup Guide

## 🚀 Quick Start

After deploying your Vercel project, you need to configure these environment variables for full functionality.

## 📧 SendGrid Setup (Required)

### 1. Create SendGrid Account
- Visit [SendGrid.com](https://sendgrid.com)
- Sign up for free account (100 emails/day free)

### 2. Generate API Key
1. Navigate to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Name: "PaperPulse Web App"
4. Permissions: **Full Access**
5. **Copy the API key immediately!**

### 3. Verify Domain (Recommended)
- Go to **Settings** → **Sender Authentication**
- Verify your domain for better deliverability

## 📬 Mailchimp Setup (Optional)

### 1. Create Mailchimp Account
- Visit [Mailchimp.com](https://mailchimp.com)
- Sign up for free (500 contacts free)

### 2. Get API Key
1. Click profile icon → **Profile**
2. **Extras** → **API Keys**
3. **"Create A Key"** → Name: "PaperPulse"
4. Copy the API key

### 3. Get List ID
1. **Audience** → **All contacts**
2. **Settings**
3. Copy the **Audience ID**

### 4. Get Server Prefix
- Look at your API key ending (e.g., `-us1`)
- Your prefix is the part after the dash

## ⚙️ Vercel Configuration

### Environment Variables to Add:

```bash
# Required for email sending
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=PaperPulse

# Optional for Mailchimp integration
MAILCHIMP_API_KEY=your_mailchimp_api_key_here
MAILCHIMP_SERVER_PREFIX=us1
MAILCHIMP_LIST_ID=your_list_id_here

# Application settings
NEXT_PUBLIC_BASE_URL=https://your-vercel-app.vercel.app
```

### How to Add in Vercel:
1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. **Settings** → **Environment Variables**
3. Add each variable with its value
4. **Redeploy** your project

## 🧪 Testing Your Setup

After getting your API keys, test them locally:

```bash
# Set your keys temporarily
export SENDGRID_API_KEY="your_key_here"
export MAILCHIMP_API_KEY="your_key_here"

# Run the test script
node scripts/test-api-keys.js
```

## 🔐 Security Best Practices

1. **Never commit API keys** to git
2. **Use environment variables** in production
3. **Rotate keys periodically**
4. **Use minimal permissions** when possible
5. **Monitor API usage** in service dashboards

## 📧 Email Templates

Your PaperPulse app will send these emails:
- **Welcome emails** when users subscribe
- **Daily digest emails** with AI paper summaries
- **Unsubscribe confirmations**

## 🔧 Troubleshooting

### SendGrid Issues:
- Verify API key has "Mail Send" permissions
- Check domain authentication
- Review SendGrid activity logs

### Mailchimp Issues:
- Ensure API key has list access
- Verify server prefix matches key
- Check audience settings

### Vercel Issues:
- Redeploy after adding environment variables
- Check function logs in Vercel dashboard
- Verify variable names match exactly

## 📞 Support

If you encounter issues:
1. Check the service status pages
2. Review API documentation
3. Contact support for the respective services

---

**Next Steps:** Once configured, test your subscription form and check that welcome emails are sent successfully! 