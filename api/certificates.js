
const express = require('express');
const acme = require('acme-client');
const crypto = require('crypto');

const router = express.Router();

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

router.post('/certificates/request', async (req, res) => {
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
    });

    // Initialize order
    const order = await client.createOrder({
      identifiers: [
        { type: 'dns', value: domain }
      ]
    });

    // Get authorizations
    const authorizations = await client.getAuthorizations(order);
    const authorization = authorizations[0];

    // Get HTTP challenge
    let challenge;
    if (validationType === 'http') {
      challenge = authorization.challenges.find(c => c.type === 'http-01');
    } else {
      challenge = authorization.challenges.find(c => c.type === 'dns-01');
    }

    if (!challenge) {
      return res.status(400).json({ error: `No ${validationType} challenge found` });
    }

    // Get key authorization
    const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

    // Store request data
    requestStore.set(requestId, {
      domain,
      email,
      order,
      authorization,
      challenge,
      keyAuthorization,
      key,
      csr,
      client
    });

    // Return validation info
    res.json({
      requestId,
      validationRequired: true,
      validation: {
        domain,
        type: challenge.type,
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

router.post('/certificates/validate/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const requestData = requestStore.get(requestId);
    
    if (!requestData) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { client, challenge, domain, authorization } = requestData;

    // Wait for the challenge file to be accessible
    const maxAttempts = 5;
    let attempts = 0;
    let verificationSuccess = false;

    while (attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1}: Verifying challenge for ${domain}...`);
        // Verify the challenge is ready
        await client.verifyChallenge(challenge);
        verificationSuccess = true;
        break;
      } catch (error) {
        console.log(`Verification attempt ${attempts + 1} failed:`, error.message);
        attempts++;
        if (attempts < maxAttempts) {
          // Wait 2 seconds before next attempt
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!verificationSuccess) {
      throw new Error('Challenge verification failed after multiple attempts');
    }

    // Complete challenge
    await client.completeChallenge(challenge);
    
    // Wait for validation
    await client.waitForValidStatus(challenge);

    res.json({ status: 'validating' });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: error.message || 'Failed to validate domain' });
  }
});

router.get('/certificates/status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const requestData = requestStore.get(requestId);

    if (!requestData) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { order, client, key, csr } = requestData;

    // Check order status
    const updatedOrder = await client.getOrder(order);

    if (updatedOrder.status === 'ready') {
      // Finalize order
      await client.finalizeOrder(order, csr);
      res.json({ status: 'processing' });
    } else if (updatedOrder.status === 'valid') {
      // Get certificate
      const certificate = await client.getCertificate(order);
      
      // Convert key to PEM format
      const privateKey = key.toString();
      
      // Extract chain certificates
      const chain = certificate.split('-----END CERTIFICATE-----')
        .filter(cert => cert.trim().length > 0)
        .map(cert => cert.trim() + '-----END CERTIFICATE-----')
        .slice(1)
        .join('\n');
      
      // Calculate expiry date (90 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90);

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

module.exports = router;
