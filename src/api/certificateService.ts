
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

class CertificateService {
  private apiBaseUrl = '/api/certificates';

  async requestCertificate(request: CertificateRequest): Promise<{
    validationRequired: boolean;
    validation?: DomainValidation;
    requestId: string;
  }> {
    const response = await fetch(`${this.apiBaseUrl}/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Certificate request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async checkValidation(requestId: string): Promise<{
    status: 'pending' | 'valid' | 'invalid';
    certificate?: CertificateResponse;
  }> {
    const response = await fetch(`${this.apiBaseUrl}/status/${requestId}`);
    
    if (!response.ok) {
      throw new Error(`Validation check failed: ${response.statusText}`);
    }

    return response.json();
  }

  async validateDomain(requestId: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/validate/${requestId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Domain validation failed: ${response.statusText}`);
    }
  }
}

export const certificateService = new CertificateService();
export type { DomainValidation, CertificateRequest, CertificateResponse };
