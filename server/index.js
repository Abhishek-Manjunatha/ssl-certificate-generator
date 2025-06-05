
const express = require('express');
const acme = require('acme-client');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// In-memory storage for requests (use Redis in production)
const requestStore = new Map();

// Let's Encrypt directory URL
const directoryUrl = process.env.ACME_ENV === 'production' 
  ? acme.directory.letsencrypt.production
  : acme.directory.letsencrypt.staging;

console.log(`Using ACME directory: ${directoryUrl}`);

// Account key storage
let accountKey;
const ACCOUNT_KEY_PATH = './account-key.pem';

async function getOrCreateAccountKey() {
  try {
    const keyData = await fs.readFile(ACCOUNT_KEY_PATH);
    accountKey = keyData.toString();
    console.log('Loaded existing account key');
  } catch (error) {
    console.log('Creating new account key...');
    accountKey = await acme.crypto.createPrivateKey();
    await fs.writeFile(ACCOUNT_KEY_PATH, accountKey);
    console.log('Account key created and saved');
  }
}

// Validation helpers
function validateDomain(domain) {
  const domainRegex = /^(?:\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Certificate request endpoint
app.post('/api/certificates/request', async (req, res) => {
  try {
    const { domain, email, validationType } = req.body;
    
    // Input validation
    if (!domain || !email || !validationType) {
      return res.status(400).json({ 
        error: 'Domain, email, and validation type are required' 
      });
    }

    if (!validateDomain(domain)) {
      return res.status(400).json({ 
        error: 'Invalid domain format' 
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    if (!['http', 'dns'].includes(validationType)) {
      return res.status(400).json({ 
        error: 'Validation type must be either "http" or "dns"' 
      });
    }

    // Generate request ID
    const requestId = crypto.randomBytes(16).toString('hex');
    
    console.log(`Processing certificate request for ${domain} (${requestId})`);

    // Create ACME client
    const client = new acme.Client({
      directoryUrl,
      accountKey
    });

    // Create account if it doesn't exist
    let account;
    try {
      account = await client.createAccount({
        termsOfServiceAgreed: true,
        contact: [`mailto:${email}`]
      });
      console.log('ACME account created/verified');
    } catch (error) {
      console.error('Account creation error:', error);
      return res.status(500).json({ 
        error: 'Failed to create ACME account' 
      });
    }

    // Create CSR
    const [key, csr] = await acme.crypto.createCsr({
      commonName: domain.startsWith('*.') ? domain.substring(2) : domain,
      altNames: [domain]
    });

    // Create order
    const identifierDomain = domain.startsWith('*.') ? domain.substring(2) : domain;
    const order = await client.createOrder({
      identifiers: [{ type: 'dns', value: identifierDomain }]
    });

    console.log('ACME order created:', order.url);

    // Get authorization
    const authorizations = await client.getAuthorizations(order);
    if (!authorizations.length) {
      return res.status(500).json({ 
        error: 'No authorizations received from ACME server' 
      });
    }

    const authorization = authorizations[0];
    
    // Find the appropriate challenge
    const challengeType = validationType === 'dns' ? 'dns-01' : 'http-01';
    const challenge = authorization.challenges.find(c => c.type === challengeType);
    
    if (!challenge) {
      return res.status(400).json({ 
        error: `${challengeType} challenge not available for this domain` 
      });
    }

    // Get key authorization
    const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

    // Store request data with timestamp
    requestStore.set(requestId, {
      domain,
      email,
      client,
      order,
      challenge,
      key,
      csr,
      keyAuthorization,
      status: 'pending',
      createdAt: Date.now(),
      validationType
    });

    // Clean up old requests (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, data] of requestStore.entries()) {
      if (data.createdAt < oneHourAgo) {
        requestStore.delete(id);
      }
    }

    console.log(`Certificate request created successfully (${requestId})`);

    res.json({
      requestId,
      validationRequired: true,
      validation: {
        domain,
        type: challengeType,
        token: challenge.token,
        keyAuthorization,
        url: challenge.url
      }
    });

  } catch (error) {
    console.error('Certificate request error:', error);
    res.status(500).json({ 
      error: 'Internal server error during certificate request' 
    });
  }
});

// Domain validation endpoint
app.post('/api/certificates/validate/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const requestData = requestStore.get(requestId);
    
    if (!requestData) {
      return res.status(404).json({ error: 'Certificate request not found or expired' });
    }

    if (requestData.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not in pending state' });
    }

    const { client, challenge } = requestData;

    console.log(`Starting validation for ${requestData.domain} (${requestId})`);

    try {
      // Verify challenge is accessible
      await client.verifyChallenge(challenge, challenge.keyAuthorization);
      console.log('Challenge verification successful');
      
      // Complete challenge
      await client.completeChallenge(challenge);
      console.log('Challenge completion successful');
      
      requestData.status = 'validating';
      requestData.validationStartedAt = Date.now();
      requestStore.set(requestId, requestData);

      res.json({ success: true, message: 'Domain validation started' });

    } catch (error) {
      console.error('Challenge verification/completion error:', error);
      requestData.status = 'failed';
      requestData.error = error.message;
      requestStore.set(requestId, requestData);
      
      res.status(400).json({ 
        error: 'Challenge verification failed. Please check your domain configuration.' 
      });
    }

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Internal server error during validation' });
  }
});

// Certificate status check endpoint
app.get('/api/certificates/status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const requestData = requestStore.get(requestId);
    
    if (!requestData) {
      return res.status(404).json({ error: 'Certificate request not found or expired' });
    }

    const { client, order, key, csr, status } = requestData;

    if (status === 'failed') {
      return res.json({ 
        status: 'invalid',
        error: requestData.error || 'Validation failed'
      });
    }

    if (status === 'pending') {
      return res.json({ status: 'pending' });
    }

    // Check order status
    try {
      const updatedOrder = await client.getOrder(order);
      console.log(`Order status for ${requestData.domain}: ${updatedOrder.status}`);
      
      if (updatedOrder.status === 'valid') {
        console.log('Finalizing certificate order...');
        
        // Generate certificate
        const cert = await client.finalizeOrder(updatedOrder, csr);
        const certificate = cert.toString();
        const privateKey = key.toString();
        
        // Get certificate chain
        const chain = await client.getCertificateChain(updatedOrder);
        
        // Calculate expiry date (Let's Encrypt certs are valid for 90 days)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);

        console.log(`Certificate generated successfully for ${requestData.domain}`);

        // Clean up
        requestStore.delete(requestId);

        res.json({
          status: 'valid',
          certificate: {
            certificate,
            privateKey,
            chainCertificate: chain,
            expiryDate: expiryDate.toISOString()
          }
        });

      } else if (updatedOrder.status === 'invalid') {
        console.log(`Order invalid for ${requestData.domain}`);
        requestStore.delete(requestId);
        res.json({ status: 'invalid' });
      } else {
        res.json({ status: 'pending' });
      }

    } catch (error) {
      console.error('Order status check error:', error);
      res.status(500).json({ error: 'Failed to check certificate status' });
    }

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Internal server error during status check' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    acme: directoryUrl
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await getOrCreateAccountKey();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Certificate server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`ACME Environment: ${process.env.ACME_ENV || 'staging'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
