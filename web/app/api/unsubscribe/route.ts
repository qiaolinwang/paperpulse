import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Mailchimp unsubscribe
    const mailchimpApiKey = process.env.MAILCHIMP_API_KEY
    const listId = process.env.MAILCHIMP_LIST_ID
    const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX || 'us1'

    if (mailchimpApiKey && listId) {
      try {
        // Create subscriber hash for Mailchimp
        const crypto = require('crypto')
        const subscriberHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex')
        
        const mailchimpUrl = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`
        
        const mailchimpResponse = await fetch(mailchimpUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${mailchimpApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'unsubscribed'
          })
        })

        if (!mailchimpResponse.ok) {
          const errorData = await mailchimpResponse.json()
          console.error('Mailchimp error:', errorData)
          
          if (errorData.title === 'Resource Not Found') {
            return NextResponse.json(
              { error: 'Email not found in subscribers' },
              { status: 404 }
            )
          }
        }
      } catch (mailchimpError) {
        console.error('Mailchimp unsubscribe failed:', mailchimpError)
        // Continue with local file update
      }
    }

    // Log unsubscribe request
    console.log('Unsubscribe request:', {
      email,
      unsubscribed_at: new Date().toISOString()
    })
    
    // In production, you would update the database:
    // await database.subscribers.update(
    //   { email },
    //   { active: false, unsubscribed_at: new Date().toISOString() }
    // )

    // Send confirmation email
    try {
      const { getEmailProvider } = await import('../../../lib/email-providers')
      const emailProvider = getEmailProvider()
      const fromEmail = process.env.FROM_EMAIL || 'noreply@paperpulse.ai'

      const emailSent = await emailProvider.send({
        to: email,
        from: fromEmail,
        subject: 'You\'ve been unsubscribed from PaperPulse',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: system-ui, sans-serif;">
            <h1 style="color: #6366f1;">Unsubscribed from PaperPulse</h1>
            <p>You have successfully unsubscribed from PaperPulse daily digests.</p>
            <p>We're sorry to see you go! If you change your mind, you can always subscribe again at <a href="${process.env.NEXT_PUBLIC_BASE_URL}">paperpulse.ai</a></p>
            <p>Your subscription data will be kept for 30 days in case you want to resubscribe with the same preferences.</p>
            <hr style="margin: 20px 0; border: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              If you didn't request this unsubscription, please contact support.
            </p>
          </div>
        `
      })

      if (emailSent) {
        console.log(`Unsubscribe confirmation sent via ${emailProvider.name} to ${email}`)
      } else {
        console.warn(`Failed to send unsubscribe confirmation via ${emailProvider.name}`)
      }
    } catch (emailError) {
      console.error('Confirmation email failed:', emailError)
      // Don't fail the unsubscription if email fails
    }

    return NextResponse.json(
      { 
        message: 'Successfully unsubscribed',
        email
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}