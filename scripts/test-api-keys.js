#!/usr/bin/env node

/**
 * PaperPulse API Keys Test Script
 * Run this script to validate your API key configurations
 */

const https = require('https');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Test SendGrid API Key
async function testSendGrid(apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.sendgrid.com',
      path: '/v3/user/profile',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        log('✅ SendGrid API key is valid!', colors.green);
        resolve(true);
      } else {
        log(`❌ SendGrid API key failed: ${res.statusCode}`, colors.red);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      log(`❌ SendGrid API test failed: ${error.message}`, colors.red);
      resolve(false);
    });

    req.end();
  });
}

// Test Resend API Key
async function testResend(apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.resend.com',
      path: '/domains',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        log('✅ Resend API key is valid!', colors.green);
        resolve(true);
      } else {
        log(`❌ Resend API key failed: ${res.statusCode}`, colors.red);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      log(`❌ Resend API test failed: ${error.message}`, colors.red);
      resolve(false);
    });

    req.end();
  });
}

// Test Mailgun API Key
async function testMailgun(apiKey, domain) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.mailgun.net',
      path: `/v3/${domain}`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        log('✅ Mailgun API key is valid!', colors.green);
        resolve(true);
      } else {
        log(`❌ Mailgun API key failed: ${res.statusCode}`, colors.red);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      log(`❌ Mailgun API test failed: ${error.message}`, colors.red);
      resolve(false);
    });

    req.end();
  });
}

// Test Postmark API Key
async function testPostmark(apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.postmarkapp.com',
      path: '/server',
      method: 'GET',
      headers: {
        'X-Postmark-Account-Token': apiKey,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        log('✅ Postmark API key is valid!', colors.green);
        resolve(true);
      } else {
        log(`❌ Postmark API key failed: ${res.statusCode}`, colors.red);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      log(`❌ Postmark API test failed: ${error.message}`, colors.red);
      resolve(false);
    });

    req.end();
  });
}

// Test Mailchimp API Key
async function testMailchimp(apiKey, serverPrefix) {
  return new Promise((resolve) => {
    const options = {
      hostname: `${serverPrefix}.api.mailchimp.com`,
      path: '/3.0/',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        log('✅ Mailchimp API key is valid!', colors.green);
        resolve(true);
      } else {
        log(`❌ Mailchimp API key failed: ${res.statusCode}`, colors.red);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      log(`❌ Mailchimp API test failed: ${error.message}`, colors.red);
      resolve(false);
    });

    req.end();
  });
}

// Main test function
async function runTests() {
  log('🚀 Testing PaperPulse API Keys...', colors.blue);
  log('=====================================', colors.blue);

  // Get API keys from environment
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const mailgunKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  const postmarkKey = process.env.POSTMARK_API_KEY;
  const mailchimpKey = process.env.MAILCHIMP_API_KEY;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX || 'us1';

  // Check for email providers
  log('📧 Email Provider Detection:', colors.blue);
  if (sendgridKey) {
    log('   Found SendGrid API key', colors.green);
  }
  if (resendKey) {
    log('   Found Resend API key', colors.green);
  }
  if (mailgunKey && mailgunDomain) {
    log('   Found Mailgun API key and domain', colors.green);
  }
  if (postmarkKey) {
    log('   Found Postmark API key', colors.green);
  }
  
  if (!sendgridKey && !resendKey && !mailgunKey && !postmarkKey) {
    log('⚠️  No email provider configured!', colors.yellow);
    log('   Recommended: Sign up for Resend.com and set RESEND_API_KEY', colors.yellow);
  }

  if (!mailchimpKey) {
    log('⚠️  MAILCHIMP_API_KEY not found (optional)', colors.yellow);
  }

  log('');

  // Test email providers
  if (sendgridKey) {
    log('Testing SendGrid API...', colors.blue);
    await testSendGrid(sendgridKey);
  }

  if (resendKey) {
    log('Testing Resend API...', colors.blue);
    await testResend(resendKey);
  }

  if (mailgunKey && mailgunDomain) {
    log('Testing Mailgun API...', colors.blue);
    await testMailgun(mailgunKey, mailgunDomain);
  }

  if (postmarkKey) {
    log('Testing Postmark API...', colors.blue);
    await testPostmark(postmarkKey);
  }

  // Test Mailchimp
  if (mailchimpKey) {
    log('Testing Mailchimp API...', colors.blue);
    await testMailchimp(mailchimpKey, serverPrefix);
  }

  log('');
  log('📋 Next Steps:', colors.blue);
  log('1. Add these keys to your Vercel environment variables', colors.reset);
  log('2. Redeploy your Vercel project', colors.reset);
  log('3. Test your subscription form on the live site', colors.reset);
  log('');
  log('💡 Tip: For easy setup, try Resend.com (3,000 free emails/month)', colors.yellow);
}

// Run the tests
runTests().catch(console.error); 