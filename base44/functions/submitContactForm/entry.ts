import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const APP_CONFIG = {
  company: {
    name: 'NexArt Pro',
    email: 'info@nexartpro.com',
    phone: '(503) 555-0100',
    city: 'Portland, OR',
  }
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Validate required fields
    const { name, phone, email, address, service, details } = body;
    if (!name || !phone || !email || !address || !service) {
      return Response.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Sanitize email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({
        success: false,
        error: 'Invalid email address'
      }, { status: 400 });
    }

    // Save lead to database
    const lead = await base44.asServiceRole.entities.Lead.create({
      name,
      phone,
      email,
      address,
      service,
      details: details || '',
      status: 'new',
      source: 'website'
    });

    // Send email to company
    await base44.integrations.Core.SendEmail({
      to: APP_CONFIG.company.email,
      from_name: 'NexArt Pro Contact Form',
      subject: `New Lead: ${name} - ${service}`,
      body: `New lead received from website.\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nAddress: ${address}\nService: ${service}\n\nProject Details:\n${details || 'No details provided'}`
    });

    // Send confirmation email to client
    await base44.integrations.Core.SendEmail({
      to: email,
      from_name: APP_CONFIG.company.name,
      subject: 'Free Estimate Request Received',
      body: `Hi ${name},\n\nThank you for requesting a free estimate! We've received your project details and will contact you within 24 hours to discuss your ${service.toLowerCase()} project.\n\nProject Address: ${address}\n\nBest regards,\n${APP_CONFIG.company.name}\n${APP_CONFIG.company.phone}`
    });

    return Response.json({
      success: true,
      leadId: lead.id,
      message: 'Lead submitted successfully'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to submit contact form'
    }, { status: 500 });
  }
});