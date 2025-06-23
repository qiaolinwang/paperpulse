# PaperPulse Setup Guide

This guide will help you set up PaperPulse from scratch.

## Prerequisites

- Python 3.9+
- Node.js 18+
- Git
- SendGrid account
- Anthropic API key
- Mailchimp account (optional)
- Vercel account (for web deployment)
- GitHub account (for agent deployment)

## Quick Setup

### 1. Clone and Setup

```bash
git clone https://github.com/yourusername/paperpulse.git
cd paperpulse
```

### 2. Agent Setup

```bash
cd agent
pip install -r requirements.txt
cp .env.sample .env
```

Edit `.env` with your API keys:
```bash
SENDGRID_API_KEY=your_sendgrid_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Web Setup

```bash
cd ../web
npm install
cp .env.sample .env.local
```

Edit `.env.local`:
```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
MAILCHIMP_API_KEY=your_mailchimp_api_key
MAILCHIMP_SERVER_PREFIX=us1
MAILCHIMP_LIST_ID=your_list_id
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@paperpulse.ai
```

### 4. Test Locally

```bash
# Terminal 1 - Test agent
cd agent
python -m paperpulse.main --dry-run

# Terminal 2 - Test web
cd web
npm run dev
```

Visit http://localhost:3000 to test the web interface.

## Production Deployment

### Deploy Web to Vercel

```bash
cd scripts
./deploy-web.sh
```

### Deploy Agent to GitHub Actions

```bash
./deploy-agent.sh
```

## API Keys Setup

### SendGrid

1. Sign up at https://sendgrid.com
2. Create an API key with "Full Access" permissions
3. Verify your sender identity/domain

### Anthropic

1. Sign up at https://console.anthropic.com
2. Create an API key
3. Ensure you have credits for Claude API usage

### Mailchimp (Optional)

1. Sign up at https://mailchimp.com
2. Create an API key
3. Create an audience/list
4. Note your server prefix (us1, us2, etc.)

## Configuration

### Subscriber Configuration

Each subscriber is configured with:

```json
{
  "email": "user@example.com",
  "keywords": ["machine learning", "nlp"],
  "digest_time_utc": "13:00",
  "max_papers": 20,
  "summary_model": "llama-3.1-8b-instant-groq",
  "tone": "concise",
  "include_pdf_link": true,
  "active": true
}
```

### Environment Variables

#### Agent (.env)
- `SENDGRID_API_KEY`: SendGrid API key  
- `GROQ_API_KEY`: Groq API key (recommended)
- `ANTHROPIC_API_KEY`: Anthropic API key (optional)
- `SUBSCRIBERS_FILE`: Path to subscribers JSON file
- `DIGEST_OUTPUT_DIR`: Directory for digest files
- `MAX_PAPERS_PER_KEYWORD`: Maximum papers per keyword search
- `DEFAULT_SUMMARY_MODEL`: Default AI model for summaries
- `FROM_EMAIL`: Sender email address
- `FROM_NAME`: Sender name

#### Web (.env.local)
- `NEXT_PUBLIC_BASE_URL`: Your website URL
- `MAILCHIMP_API_KEY`: Mailchimp API key (optional)
- `MAILCHIMP_SERVER_PREFIX`: Mailchimp server prefix
- `MAILCHIMP_LIST_ID`: Mailchimp list ID
- `SENDGRID_API_KEY`: SendGrid API key
- `FROM_EMAIL`: Sender email address

## Troubleshooting

### Agent Issues

1. **No papers found**: Check your keywords and date range
2. **API errors**: Verify your API keys and quotas
3. **Email not sending**: Check SendGrid configuration and sender verification

### Web Issues

1. **Subscription not working**: Check API keys and Mailchimp configuration
2. **Browse page empty**: Ensure agent has run and generated digest files
3. **Build errors**: Check Node.js version and dependencies

### Common Issues

1. **Rate limiting**: arXiv API has rate limits, the agent handles this automatically
2. **Email in spam**: Set up SPF/DKIM records for your domain
3. **Large digest files**: Adjust `MAX_PAPERS_PER_KEYWORD` and `max_papers` per subscriber

## Monitoring

### GitHub Actions

- Check the Actions tab in your repository
- Monitor workflow runs and logs
- Set up notifications for failed runs

### Vercel

- Monitor function execution times
- Check deployment logs
- Set up error tracking

### Email Delivery

- Monitor SendGrid dashboard for delivery statistics
- Check bounce rates and spam reports
- Set up webhook for delivery events

## Scaling

### High Volume

1. Implement Redis caching for paper summaries
2. Use a proper database instead of JSON files
3. Implement queue system for email sending
4. Add monitoring and alerting

### Multiple Instances

1. Use shared database for subscribers
2. Implement distributed caching
3. Load balance web instances
4. Use dedicated email service

## Security

1. Never commit API keys to version control
2. Use environment variables for all secrets
3. Implement rate limiting on API endpoints
4. Validate all user inputs
5. Use HTTPS for all communications

## Maintenance

### Regular Tasks

1. Monitor API usage and costs
2. Clean up old digest files
3. Update dependencies
4. Review and optimize email templates
5. Analyze subscriber engagement

### Updates

1. Test in development environment first
2. Use Vercel preview deployments for web changes
3. Test agent changes with `--dry-run` flag
4. Monitor after deployments

## Support

- Check GitHub Issues for common problems
- Review logs in GitHub Actions and Vercel
- Test with smaller datasets first
- Use `--dry-run` mode for testing
```