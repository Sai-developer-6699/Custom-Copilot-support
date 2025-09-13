// Mock data for tickets
export const mockTickets = [
  {
    id: 1,
    ticketNumber: 'TKT-2024-001',
    topic: 'Login Issue',
    sentiment: 'Negative',
    priority: 'High',
    response: 'Please try clearing your browser cache and cookies, then attempt to log in again.'
  },
  {
    id: 2,
    ticketNumber: 'TKT-2024-002',
    topic: 'Feature Request',
    sentiment: 'Positive',
    priority: 'Low',
    response: 'Thank you for your suggestion! We have forwarded this to our product team for consideration.'
  },
  {
    id: 3,
    ticketNumber: 'TKT-2024-003',
    topic: 'Data Export',
    sentiment: 'Neutral',
    priority: 'Medium',
    response: 'You can export your data by navigating to Settings > Export Data. The process may take a few minutes.'
  },
  {
    id: 4,
    ticketNumber: 'TKT-2024-004',
    topic: 'Billing Question',
    sentiment: 'Neutral',
    priority: 'Medium',
    response: 'Your current plan includes unlimited queries. The next billing cycle starts on the 15th of next month.'
  },
  {
    id: 5,
    ticketNumber: 'TKT-2024-005',
    topic: 'Performance Issue',
    sentiment: 'Negative',
    priority: 'High',
    response: 'We are investigating this performance issue. Our engineering team will provide an update within 24 hours.'
  },
  {
    id: 6,
    ticketNumber: 'TKT-2024-006',
    topic: 'Integration Help',
    sentiment: 'Neutral',
    priority: 'Medium',
    response: 'Please refer to our API documentation at docs.atlan.com/api. You can also schedule a call with our integration team.'
  },
  {
    id: 7,
    ticketNumber: 'TKT-2024-007',
    topic: 'Account Setup',
    sentiment: 'Positive',
    priority: 'Low',
    response: 'Welcome to Atlan! Your account has been successfully set up. Check your email for next steps.'
  },
  {
    id: 8,
    ticketNumber: 'TKT-2024-008',
    topic: 'Data Security',
    sentiment: 'Neutral',
    priority: 'High',
    response: 'Your data is encrypted both at rest and in transit. We comply with SOC 2 Type II and GDPR standards.'
  }
];

// Function to generate mock analysis based on query
export const generateMockAnalysis = (query) => {
  const topics = ['Login Issue', 'Feature Request', 'Data Export', 'Billing Question', 'Performance Issue', 'Integration Help', 'Account Setup', 'Data Security'];
  const sentiments = ['Positive', 'Negative', 'Neutral'];
  const priorities = ['High', 'Medium', 'Low'];
  
  // Simple keyword-based classification (mock)
  let topic = 'General Inquiry';
  let sentiment = 'Neutral';
  let priority = 'Medium';
  
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('login') || lowerQuery.includes('password') || lowerQuery.includes('access')) {
    topic = 'Login Issue';
    priority = 'High';
  } else if (lowerQuery.includes('feature') || lowerQuery.includes('request') || lowerQuery.includes('suggest')) {
    topic = 'Feature Request';
    sentiment = 'Positive';
    priority = 'Low';
  } else if (lowerQuery.includes('export') || lowerQuery.includes('download') || lowerQuery.includes('data')) {
    topic = 'Data Export';
  } else if (lowerQuery.includes('bill') || lowerQuery.includes('payment') || lowerQuery.includes('price')) {
    topic = 'Billing Question';
  } else if (lowerQuery.includes('slow') || lowerQuery.includes('performance') || lowerQuery.includes('lag')) {
    topic = 'Performance Issue';
    sentiment = 'Negative';
    priority = 'High';
  } else if (lowerQuery.includes('api') || lowerQuery.includes('integration') || lowerQuery.includes('connect')) {
    topic = 'Integration Help';
  } else if (lowerQuery.includes('setup') || lowerQuery.includes('account') || lowerQuery.includes('new')) {
    topic = 'Account Setup';
    sentiment = 'Positive';
  } else if (lowerQuery.includes('security') || lowerQuery.includes('privacy') || lowerQuery.includes('safe')) {
    topic = 'Data Security';
    priority = 'High';
  }
  
  // Sentiment analysis based on keywords
  if (lowerQuery.includes('great') || lowerQuery.includes('love') || lowerQuery.includes('awesome') || lowerQuery.includes('thank')) {
    sentiment = 'Positive';
  } else if (lowerQuery.includes('issue') || lowerQuery.includes('problem') || lowerQuery.includes('error') || lowerQuery.includes('wrong')) {
    sentiment = 'Negative';
  }
  
  // Generate mock responses based on topic
  const responses = {
    'Login Issue': `I understand you're experiencing login difficulties. Here are some steps to resolve this:

1. Clear your browser cache and cookies
2. Try using an incognito/private browsing window
3. Ensure you're using the correct email address
4. Check if Caps Lock is enabled

If these steps don't work, please try resetting your password using the "Forgot Password" link. Our system shows your account is active and in good standing.`,
    
    'Feature Request': `Thank you for taking the time to share your feature suggestion with us! Your feedback is incredibly valuable and helps us improve our platform.

I've forwarded your request to our product team for review. They evaluate all feature requests based on user demand, technical feasibility, and alignment with our roadmap.

You can track feature requests and vote on existing ones in our community forum. We typically provide updates on feature development during our monthly product releases.`,
    
    'Data Export': `I can help you export your data from Atlan. Here's how to do it:

1. Navigate to Settings → Data Management → Export
2. Select the data types you want to export (metadata, lineage, etc.)
3. Choose your preferred format (CSV, JSON, or Excel)
4. Click "Start Export"

Large exports may take several minutes to complete. You'll receive an email notification when your export is ready for download. Exported files are available for 7 days.`,
    
    'Billing Question': `I'm happy to help with your billing inquiry. Based on your account:

- Current Plan: Professional Plan
- Billing Cycle: Monthly (renews on the 15th)
- Next Charge: $299 on March 15th, 2024
- Payment Method: Credit card ending in 4567

You can view detailed billing history, update payment methods, or change your plan in the Billing section of your account settings. For enterprise pricing or custom arrangements, please contact our sales team.`,
    
    'Performance Issue': `I apologize for the performance issues you're experiencing. Let me help you troubleshoot this:

Our monitoring shows some elevated response times in the past hour, which our engineering team is actively investigating. Here are some immediate steps you can try:

1. Refresh your browser and clear cache
2. Try accessing from a different network
3. Reduce the complexity of your current query if applicable

Our team has been notified and is working on a resolution. We expect performance to return to normal within the next 30 minutes. I'll keep you updated on our progress.`,
    
    'Integration Help': `I'd be happy to assist with your integration needs. Atlan offers several integration options:

**API Integration:**
- REST API with comprehensive documentation
- GraphQL endpoint for flexible queries
- Webhook support for real-time updates

**Pre-built Connectors:**
- 100+ data sources supported
- Popular tools: Snowflake, Databricks, dbt, Looker

**Getting Started:**
1. Generate API keys in Settings → Developer
2. Review our API documentation at docs.atlan.com
3. Use our Postman collection for testing

Would you like me to schedule a technical consultation call with our integration specialists?`,
    
    'Account Setup': `Welcome to Atlan! I'm excited to help you get started. Your account setup is proceeding smoothly:

**Completed Steps:**
✅ Account created and verified
✅ Initial workspace configured
✅ Basic permissions assigned

**Next Steps:**
1. Complete your team member invitations
2. Connect your first data source
3. Set up your metadata standards
4. Schedule a success manager call

I've sent a detailed onboarding checklist to your email. Our customer success team will reach out within 24 hours to schedule your kickoff call and ensure you're getting the most value from Atlan.`,
    
    'Data Security': `Security is our top priority at Atlan. Here's how we protect your data:

**Encryption:**
- Data encrypted at rest (AES-256)
- Data encrypted in transit (TLS 1.3)
- End-to-end encryption for sensitive operations

**Compliance:**
- SOC 2 Type II certified
- GDPR compliant
- HIPAA compliance available

**Access Controls:**
- Role-based access control (RBAC)
- Single sign-on (SSO) integration
- Multi-factor authentication (MFA)

**Monitoring:**
- 24/7 security monitoring
- Regular penetration testing
- Automated threat detection

Your data remains within your specified geographic region and is never shared with third parties. Would you like me to provide our detailed security whitepaper?`,
    
    'General Inquiry': `Thank you for reaching out! I'm here to help with any questions about Atlan.

Based on your query, I can assist you with:
- Account management and settings
- Data cataloging and governance features  
- Integration and API questions
- Billing and subscription management
- Technical troubleshooting

Could you provide a bit more detail about what specifically you'd like help with? This will allow me to give you the most accurate and helpful response.

You can also browse our help center at help.atlan.com or schedule a call with our support team if you prefer to discuss your needs in detail.`
  };

  return {
    topic,
    sentiment,  
    priority,
    confidence: Math.floor(Math.random() * 15) + 85, // 85-99%
    processingTime: Math.floor(Math.random() * 500) + 200, // 200-700ms
    details: `Query analyzed using natural language processing. Classified as ${topic.toLowerCase()} with ${sentiment.toLowerCase()} sentiment. Priority determined based on urgency indicators and topic classification.`,
    response: responses[topic] || responses['General Inquiry']
  };
};
