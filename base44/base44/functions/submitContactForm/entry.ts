import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Validate required fields
    const required = ['name', 'phone', 'email', 'address', 'service'];
    for (const field of required) {
      if (!body[field] || typeof body[field] !== 'string' || body[field].trim() === '') {
        return Response.json(
          { error: `Missing or invalid required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return Response.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create lead in database
    const leadData = {
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email.trim(),
      address: body.address.trim(),
      service: body.service.trim(),
      details: body.details ? body.details.trim() : '',
      status: 'new',
      source: 'website'
    };

    const createdLead = await base44.asServiceRole.entities.Lead.create(leadData);

    // Send email to company
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'sales@nexartpro.com',
      subject: `New Lead Received - ${body.name}`,
      body: `
A new lead has been submitted through your website:

Name: ${body.name}
Email: ${body.email}
Phone: ${body.phone}
Address: ${body.address}
Service: ${body.service}
Project Details: ${body.details || 'No details provided'}

Please contact this lead within 24 hours.
      `.trim(),
      from_name: 'NexArt Pro'
    });

    // Send confirmation email to client
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: body.email,
      subject: 'We Received Your Estimate Request',
      body: `
Hello ${body.name},

Thank you for submitting your estimate request! We've received your information and will review your project details.

Our team will contact you within 24 hours at ${body.phone} to discuss your ${body.service} project and provide you with a detailed estimate.

Project Address: ${body.address}

If you have any questions in the meantime, feel free to reach out to us.

Best regards,
NexArt Pro Team
      `.trim(),
      from_name: 'NexArt Pro'
    });

    return Response.json({
      success: true,
      message: 'Lead created successfully',
      leadId: createdLead.id
    }, { status: 201 });

  } catch (error) {
    console.error('Error in submitContactForm:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});