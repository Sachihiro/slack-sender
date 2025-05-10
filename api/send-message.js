// api/send-message.js - Vercel API route
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    // Handle preflight request (OPTIONS method)
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  
    // Handle POST request
    if (req.method === 'POST') {
      try {
        console.log('Request received in Vercel function');
        
        // Parse the body if needed
        let message, webhook;
        
        if (typeof req.body === 'string') {
          try {
            const parsedBody = JSON.parse(req.body);
            message = parsedBody.message;
            webhook = parsedBody.webhook;
          } catch (parseError) {
            console.error('Error parsing JSON body:', parseError);
            return res.status(400).json({ error: 'Invalid JSON in request body' });
          }
        } else {
          // Body should already be parsed as object by Vercel
          message = req.body.message;
          webhook = req.body.webhook;
        }
  
        // Validate inputs
        if (!message) {
          return res.status(400).json({ error: 'Message is required' });
        }
        
        if (!webhook) {
          return res.status(400).json({ error: 'Webhook URL is required' });
        }
  
        // Validate webhook URL format
        if (!webhook.startsWith('https://hooks.slack.com/services/')) {
          return res.status(400).json({ error: 'Invalid Slack webhook URL format' });
        }
  
        // Send message to Slack
        try {
          const slackResponse = await fetch(webhook, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: message }),
          });
          
          // Get response text for debugging
          const responseText = await slackResponse.text();
          
          if (!slackResponse.ok) {
            throw new Error(`Slack API returned ${slackResponse.status}: ${responseText || 'No response details'}`);
          }
          
          return res.status(200).json({ status: 'Message sent successfully!' });
        } catch (slackError) {
          console.error('Error in Slack API call:', slackError);
          return res.status(500).json({ 
            error: 'Failed to send message to Slack API',
            details: slackError.message
          });
        }
      } catch (error) {
        console.error('General error in API handler:', error);
        return res.status(500).json({
          error: 'Failed to process request',
          details: error.message,
        });
      }
    } else {
      // Method not allowed
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  }