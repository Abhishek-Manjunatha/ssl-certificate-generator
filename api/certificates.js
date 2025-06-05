
const express = require('express');
const acme = require('acme-client');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage for demonstration (use Redis or database in production)
const requestStore = new Map();

// Let's Encrypt directory URL (use staging for testing)
const directoryUrl = process.env.NODE_ENV === 'production' 
  ? acme.directory.letsencrypt.production
  : acme.directory.letsencrypt.staging;

// Generate account key pair
let accountKey;
(async () => {
  accountKey = await acme.crypto.createPrivateKey();
})();

app.post('/api/certificates/request', async (req, res) => {
  try {
    const { domain, email, validationType } = req.body;
    
    if (!domain || !email) {
      return res.status(400).json({ error: 'Domain and email are required' });
    }

    // Generate request ID
    const requestId = crypto.randomBytes(16).toString('hex');
    
    // Create ACME client
    const client = new acme.Client({
      directoryUrl,
      accountKey
    });

    // Create account if it doesn't exist
    const account = await client.createAccount({
      termsOfServiceAgreed: true,
      contact: [`mailto:${email}`]
    });

    // Create CSR
    const [key, csr] = await acme.crypto.createCsr({
      commonName: domain,
      altNames: domain.startsWith('*.') ? [domain] : undefined
    });

    // Create order
    const order = await client.createOrder({
      identifiers: [
        { type: 'dns', value: domain.startsWith('*.') ? domain.substring(2) : domain }
      ]
    });

    // Get authorization
    const authorizations = await client.getAuthorizations(order);
    const authorization = authorizations[0];
    
    // Find the appropriate challenge
    const challengeType = validationType === 'dns' ? 'dns-01' : 'http-01';
    const challenge = authorization.challenges.find(c => c.type === challengeType);
    
    if (!challenge) {
      return res.status(400).json({ error: `${challengeType} challenge not available` });
    }

    // Get key authorization
    const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

    // Store request data
    requestStore.set(requestId, {
      domain,
      email,
      client,
      order,
      challenge,
      key,
      csr,
      keyAuthorization,
      status: 'pending'
    });

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
    res.status(500).json({ error: 'Failed to request certificate' });
  }
});

app.post('/api/certificates/validate/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const requestData = requestStore.get(requestId);
    
    if (!requestData) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { client, challenge } = requestData;

    // Verify challenge
    await client.verifyChallenge(challenge, challenge.keyAuthorization);
    
    // Complete challenge
    await client.completeChallenge(challenge);
    
    requestData.status = 'validating';
    requestStore.set(requestId, requestData);

    res.json({ success: true });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Failed to validate domain' });
  }
});

app.get('/api/certificates/status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const requestData = requestStore.get(requestId);
    
    if (!requestData) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { client, order, key, csr } = requestData;

    // Check order status
    const updatedOrder = await client.getOrder(order);
    
    if (updatedOrder.status === 'valid') {
      // Generate certificate
      const cert = await client.finalizeOrder(updatedOrder, csr);
      const certificate = cert.toString();
      const privateKey = key.toString();
      
      // Get certificate chain
      const chain = await client.getCertificateChain(updatedOrder);
      
      // Calculate expiry date (Let's Encrypt certs are valid for 90 days)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90);

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
      res.json({ status: 'invalid' });
    } else {
      res.json({ status: 'pending' });
    }

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check certificate status' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Certificate API server running on port ${PORT}`);
});

module.exports = app;
