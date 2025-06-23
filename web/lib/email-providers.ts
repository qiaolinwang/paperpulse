// Email provider configurations and utilities
// Supports multiple providers as alternatives to SendGrid

export interface EmailProvider {
  name: string;
  send: (options: EmailOptions) => Promise<boolean>;
}

export interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
}

// Resend.com provider (recommended alternative)
export const ResendProvider: EmailProvider = {
  name: 'Resend',
  send: async (options: EmailOptions) => {
    try {
      console.log('🔄 Sending email via Resend to:', options.to);
      
      const requestBody = {
        from: options.from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      };
      
      console.log('📧 Resend request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      console.log('📬 Resend response:', response.status, responseData);

      if (response.ok) {
        console.log('✅ Email sent successfully via Resend');
        return true;
      } else {
        console.error('❌ Resend API error:', responseData);
        return false;
      }
    } catch (error) {
      console.error('💥 Resend email failed with exception:', error);
      return false;
    }
  },
};

// Mailgun provider
export const MailgunProvider: EmailProvider = {
  name: 'Mailgun',
  send: async (options: EmailOptions) => {
    try {
      const domain = process.env.MAILGUN_DOMAIN;
      const formData = new FormData();
      formData.append('from', options.from);
      formData.append('to', options.to);
      formData.append('subject', options.subject);
      formData.append('html', options.html);

      const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
        },
        body: formData,
      });

      return response.ok;
    } catch (error) {
      console.error('Mailgun email failed:', error);
      return false;
    }
  },
};

// Postmark provider
export const PostmarkProvider: EmailProvider = {
  name: 'Postmark',
  send: async (options: EmailOptions) => {
    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.POSTMARK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: options.from,
          To: options.to,
          Subject: options.subject,
          HtmlBody: options.html,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Postmark email failed:', error);
      return false;
    }
  },
};

// SMTP provider (fallback option)
export const SMTPProvider: EmailProvider = {
  name: 'SMTP',
  send: async (options: EmailOptions) => {
    // This would require nodemailer setup
    // For now, return false to indicate it needs configuration
    console.log('SMTP provider needs nodemailer configuration');
    return false;
  },
};

// Provider selection logic
export function getEmailProvider(): EmailProvider {
  // Check which provider is configured
  if (process.env.RESEND_API_KEY) {
    return ResendProvider;
  }
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    return MailgunProvider;
  }
  if (process.env.POSTMARK_API_KEY) {
    return PostmarkProvider;
  }
  
  // Fallback to console logging for development
  return {
    name: 'Console',
    send: async (options: EmailOptions) => {
      console.log('📧 Email would be sent:', {
        to: options.to,
        subject: options.subject,
        from: options.from
      });
      return true; // Always succeed in development
    }
  };
} 