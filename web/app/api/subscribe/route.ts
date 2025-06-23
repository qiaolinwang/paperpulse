import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, keywords } = body

    if (!email || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Email and keywords are required' },
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

    // Create Supabase client with service role key for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if email already exists
    const { data: existingSubscription, error: checkError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Database check error:', checkError)
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      )
    }

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Email already subscribed' },
        { status: 409 }
      )
    }

    // Create subscription in database
    const subscriptionData = {
      email,
      keywords,
      digest_time: "13:00",
      max_papers: 20,
      summary_model: "llama-3.1-8b-instant-groq",
      tone: "concise",
      include_pdf_link: true,
      active: true
    }

    const { data: newSubscription, error: insertError } = await supabase
      .from('subscriptions')
      .insert([subscriptionData])
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      )
    }

    console.log('✅ New subscription created:', {
      id: newSubscription.id,
      email: newSubscription.email,
      keywords: newSubscription.keywords
    })

    // Mailchimp integration (optional)
    const mailchimpApiKey = process.env.MAILCHIMP_API_KEY
    const listId = process.env.MAILCHIMP_LIST_ID
    const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX || 'us1'

    if (mailchimpApiKey && listId) {
      try {
        const mailchimpUrl = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members`
        
        const mailchimpResponse = await fetch(mailchimpUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mailchimpApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email_address: email,
            status: 'subscribed',
            merge_fields: {
              KEYWORDS: keywords.join(', ')
            },
            tags: keywords.map((keyword: string) => keyword.toLowerCase())
          })
        })

        if (!mailchimpResponse.ok) {
          const errorData = await mailchimpResponse.json()
          console.error('Mailchimp error:', errorData)
        } else {
          console.log('✅ Mailchimp subscription successful')
        }
      } catch (mailchimpError) {
        console.error('Mailchimp integration failed:', mailchimpError)
      }
    }

    // Send confirmation email
    try {
      const { getEmailProvider } = await import('../../../lib/email-providers')
      const emailProvider = getEmailProvider()
      const fromEmail = process.env.FROM_EMAIL || 'noreply@paperpulse.ai'

      console.log(`Attempting to send welcome email to ${email} using ${emailProvider.name} provider`)

      const emailSent = await emailProvider.send({
        to: email,
        from: fromEmail,
        subject: 'Welcome to PaperPulse! 📚',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: system-ui, sans-serif;">
            <h1 style="color: #6366f1;">Welcome to PaperPulse! 🎉</h1>
            <p>Thank you for subscribing to your daily AI paper digest.</p>
            <p><strong>Your keywords:</strong> ${keywords.join(', ')}</p>
            <p>You'll receive your first digest tomorrow morning with the latest papers matching your interests.</p>
            <p>You can update your preferences anytime at <a href="${process.env.NEXT_PUBLIC_BASE_URL}/settings">paperpulse.ai/settings</a></p>
            <hr style="margin: 20px 0; border: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              If you didn't sign up for this, you can safely ignore this email.
            </p>
          </div>
        `
      })

      if (emailSent) {
        console.log(`✅ Welcome email sent successfully to ${email}`)
      } else {
        console.warn(`❌ Failed to send welcome email to ${email}`)
      }
    } catch (emailError) {
      console.error('Confirmation email failed:', emailError)
      // Don't fail the subscription if email fails
    }

    return NextResponse.json(
      { 
        message: 'Successfully subscribed!',
        email,
        keywords,
        subscription_id: newSubscription.id
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}