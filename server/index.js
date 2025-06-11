const express = require('express');
const acme = require('acme-client');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

const app = express();
const upload = multer();

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Serve static files regardless of environment
app.use(express.static(path.join(__dirname, '../dist')));

// In-memory storage for requests and stats
const requestStore = new Map();
const statsStore = {
  totalCertificates: 0,
  failedAttempts: 0,
  emailsUsed: new Set(),
  certificatesToday: 0,
  lastReset: new Date().setHours(0, 0, 0, 0)
};

// Reset daily stats if needed
function resetDailyStats() {
  const now = new Date().setHours(0, 0, 0, 0);
  if (now > statsStore.lastReset) {
    statsStore.certificatesToday = 0;
    statsStore.lastReset = now;
  }
}

// Update stats when certificate is generated
function updateStats(success, email) {
  resetDailyStats();
  if (success) {
    statsStore.totalCertificates++;
    statsStore.certificatesToday++;
    if (email) statsStore.emailsUsed.add(email);
  } else {
    statsStore.failedAttempts++;
  }
}

// Let's Encrypt directory URL
const directoryUrl = process.env.ACME_ENV === 'staging'
  ? acme.directory.letsencrypt.staging
  : acme.directory.letsencrypt.production;

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

    // Enforce validation rules
    const isWildcard = domain.startsWith('*.');
    if (isWildcard && validationType !== 'dns') {
      return res.status(400).json({
        error: 'Wildcard certificates require DNS (CNAME) validation.'
      });
    }
    if (!isWildcard && !['http', 'https', 'dns', 'email'].includes(validationType)) {
      return res.status(400).json({
        error: 'Validation type must be one of: http, https, dns, email.'
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

    // Prepare altNames for CSR and order
    const baseDomain = isWildcard ? domain.substring(2) : domain;
    const altNames = isWildcard ? [baseDomain, domain] : [domain];

    // Create CSR
    const [key, csr] = await acme.crypto.createCsr({
      commonName: baseDomain,
      altNames
    });

    // Create order
    const order = await client.createOrder({
      identifiers: altNames.map(d => ({ type: 'dns', value: d }))
    });

    console.log('ACME order created:', order.url);

    // Get all authorizations and challenges
    const authorizations = await client.getAuthorizations(order);
    console.log('Full authorizations object:', JSON.stringify(authorizations, null, 2));
    if (!authorizations.length) {
      return res.status(500).json({ 
        error: 'No authorizations received from ACME server' 
      });
    }

    // Collect challenges based on validation type
    const challenges = [];
    for (const auth of authorizations) {
      let challenge;
      if (validationType === 'http') {
        challenge = auth.challenges.find(c => c.type === 'http-01');
      } else {
        challenge = auth.challenges.find(c => c.type === 'dns-01');
      }
      
      if (challenge) {
        const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);
        challenges.push({
          domain: auth.identifier.value,
          type: challenge.type,
          token: challenge.token,
          keyAuthorization,
          url: challenge.url
        });
      }
    }

    // Store all challenges in the request
    requestStore.set(requestId, {
      domain,
      email,
      client,
      order,
      authorizations,
      challenges,
      key,
      csr,
      status: 'pending',
      createdAt: Date.now(),
      validationType,
      fileProtocol: validationType === 'https' ? 'https' : 'http'
    });

    // Clean up old requests (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, data] of requestStore.entries()) {
      if (data.createdAt < oneHourAgo) {
        requestStore.delete(id);
      }
    }

    console.log(`Certificate request created successfully (${requestId})`);

    // Prepare response for validation step
    let validationResponse;
    if (isWildcard) {
      // Wildcard: always DNS, return all DNS-01 challenges
      validationResponse = {
        type: 'dns-01',
        dnsChallenges: challenges.filter(c => c.type === 'dns-01').map(c => ({
          domain: c.domain,
          txtRecordName: `_acme-challenge.${c.domain}`,
          keyAuthorization: c.keyAuthorization
        }))
      };
    } else {
      // Standard: return both HTTP-01 and DNS-01 if available
      const httpChallenge = challenges.find(c => c.type === 'http-01');
      const dnsChallenge = challenges.find(c => c.type === 'dns-01');
      validationResponse = {
        type: httpChallenge ? 'http-01' : 'dns-01', // default to HTTP if available
        httpChallenge: httpChallenge ? {
          domain: httpChallenge.domain,
          type: httpChallenge.type,
          token: httpChallenge.token,
          keyAuthorization: httpChallenge.keyAuthorization,
          url: httpChallenge.url
        } : undefined,
        dnsChallenge: dnsChallenge ? {
          domain: dnsChallenge.domain,
          type: dnsChallenge.type,
          token: dnsChallenge.token,
          keyAuthorization: dnsChallenge.keyAuthorization,
          url: dnsChallenge.url,
          txtRecordName: `_acme-challenge.${dnsChallenge.domain}`
        } : undefined
      };
    }

    // Update stats for the request
    updateStats(true, email);

    res.json({
      requestId,
      validationRequired: true,
      validation: validationResponse
    });

  } catch (error) {
    updateStats(false);
    console.error('Certificate request error:', error);
    res.status(500).json({ error: 'Failed to process certificate request' });
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
    const { client, authorizations, order, validationType } = requestData;
    
    // Wait for all authorizations to be valid
    let allValid = false;
    let attempts = 0;
    const maxAttempts = 15;
    while (!allValid && attempts < maxAttempts) {
      // Complete all pending challenges based on validation type
      for (const auth of authorizations) {
        const challengeType = validationType === 'http' ? 'http-01' : 'dns-01';
        const challenge = auth.challenges.find(c => c.type === challengeType);
        if (challenge && challenge.status !== 'valid') {
          await client.completeChallenge(challenge);
        }
      }
      // Poll all authorizations
      await new Promise(resolve => setTimeout(resolve, 2000));
      const updatedAuths = await client.getAuthorizations(order);
      allValid = updatedAuths.every(auth => {
        const challengeType = validationType === 'http' ? 'http-01' : 'dns-01';
        const challenge = auth.challenges.find(c => c.type === challengeType);
        return challenge && challenge.status === 'valid';
      });
      attempts++;
    }
    if (!allValid) {
      return res.status(400).json({ 
        error: `${validationType.toUpperCase()} challenge(s) not validated in time.` 
      });
    }
    requestData.status = 'validating';
    requestData.validationStartedAt = Date.now();
    requestStore.set(requestId, requestData);
    res.json({ 
      success: true, 
      message: `All ${validationType.toUpperCase()} challenges validated.` 
    });
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
      if (updatedOrder.status === 'ready') {
        // Finalize the order to get the certificate
        console.log('Finalizing certificate order...');
        await client.finalizeOrder(updatedOrder, csr);
        // Poll for order to become 'valid'
        let certOrder = updatedOrder;
        let attempts = 0;
        const maxAttempts = 15; // 2s * 15 = 30s
        while (certOrder.status !== 'valid' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          certOrder = await client.getOrder(order);
          console.log(`Polling order status for ${requestData.domain}: ${certOrder.status}`);
          attempts++;
        }
        if (certOrder.status !== 'valid') {
          console.error('Certificate not ready after polling.');
          return res.status(500).json({ error: 'Certificate not ready after polling.' });
        }
        // After finalization and polling, fetch the certificate
        const certificatePem = await client.getCertificate(certOrder);
        const privateKey = key.toString();
        // For now, just return the full PEM as both certificate and chainCertificate
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 90);
        console.log(`Certificate generated successfully for ${requestData.domain}`);
        // Clean up
        requestStore.delete(requestId);
        return res.json({
          status: 'valid',
          certificate: {
            certificate: certificatePem,
            privateKey,
            chainCertificate: certificatePem,
            expiryDate: expiryDate.toISOString()
          }
        });
      } else if (updatedOrder.status === 'valid') {
        // Already finalized, fetch the certificate (optional: implement if needed)
        res.json({ status: 'valid', message: 'Certificate already finalized.' });
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
  // Production-specific configuration can go here if needed
  console.log('Running in production mode');
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Import routes from api/certificates.js
const certificatesRouter = require('../api/certificates');

// Use the certificates router for /api/certificates routes
app.use('/api', certificatesRouter);

// Admin credentials storage
const adminCredentials = {
  passcode: 'admin123', // Default passcode
  token: 'admin-token-123' // Default token
};

// Simple admin auth middleware
const adminAuth = (req, res, next) => {
  console.log('Checking admin auth');
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No auth header or invalid format');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Received token:', token);
  if (token !== adminCredentials.token) {
    console.log('Invalid token');
    return res.status(401).json({ error: 'Invalid token' });
  }

  console.log('Auth successful');
  next();
};

// Admin routes
app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body;
  console.log('Login attempt with passcode:', passcode);
  if (passcode === adminCredentials.passcode) {
    console.log('Login successful');
    res.json({ token: adminCredentials.token });
  } else {
    console.log('Login failed - invalid passcode');
    res.status(401).json({ error: 'Invalid passcode' });
  }
});

// Change admin passcode
app.post('/api/admin/change-passcode', adminAuth, (req, res) => {
  console.log('Received passcode change request');
  const { newPasscode } = req.body;
  
  if (!newPasscode || newPasscode.length < 6) {
    console.log('Invalid new passcode length');
    return res.status(400).json({ error: 'Passcode must be at least 6 characters long' });
  }

  try {
    console.log('Updating passcode from', adminCredentials.passcode, 'to', newPasscode);
    // Update the passcode
    adminCredentials.passcode = newPasscode;
    console.log('Passcode updated successfully');

    res.json({ 
      success: true, 
      message: 'Passcode updated successfully'
    });
  } catch (error) {
    console.error('Error updating passcode:', error);
    res.status(500).json({ error: 'Failed to update passcode' });
  }
});

app.get('/api/admin/stats', adminAuth, (req, res) => {
  resetDailyStats();
  res.json({
    totalCertificates: statsStore.totalCertificates,
    failedAttempts: statsStore.failedAttempts,
    emailsUsed: Array.from(statsStore.emailsUsed),
    certificatesToday: statsStore.certificatesToday
  });
});

app.post('/api/admin/logo', adminAuth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Update the logo path in your configuration or database
    // This is just an example - adjust according to your needs
    const logoPath = `/uploads/${req.file.filename}`;
    
    // You might want to store this in a configuration file or database
    process.env.LOGO_PATH = logoPath;

    res.json({ success: true, logoPath });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update logo' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
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
