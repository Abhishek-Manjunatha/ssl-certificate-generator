
interface DomainValidation {
  domain: string;
  type: 'http-01' | 'dns-01';
  token: string;
  keyAuthorization: string;
  url: string;
}

interface CertificateRequest {
  domain: string;
  email: string;
  validationType: 'http' | 'dns';
}

interface CertificateResponse {
  certificate: string;
  privateKey: string;
  chainCertificate: string;
  expiryDate: string;
}

// Use window.location.origin to dynamically determine the API base URL
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : `${window.location.origin}`;

class CertificateService {
  async requestCertificate(request: CertificateRequest): Promise<{
    validationRequired: boolean;
    validation?: DomainValidation;
    requestId: string;
  }> {
    console.log('Requesting certificate from backend:', request);
    console.log('Using API URL:', `${API_BASE_URL}/api/certificates/request`);
    
    const response = await fetch(`${API_BASE_URL}/api/certificates/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to request certificate');
    }

    return await response.json();
  }

  async checkValidation(requestId: string): Promise<{
    status: 'pending' | 'valid' | 'invalid';
    certificate?: CertificateResponse;
  }> {
    console.log('Checking validation status:', requestId);
    
    const response = await fetch(`${API_BASE_URL}/api/certificates/status/${requestId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check validation status');
    }

    return await response.json();
  }

  async validateDomain(requestId: string): Promise<void> {
    console.log('Starting domain validation:', requestId);
    
    const response = await fetch(`${API_BASE_URL}/api/certificates/validate/${requestId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to validate domain');
    }
  }
}

export const certificateService = new CertificateService();
export type { DomainValidation, CertificateRequest, CertificateResponse };
