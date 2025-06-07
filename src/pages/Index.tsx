import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Shield, Download, Copy, CheckCircle, AlertCircle, Globe, Lock, Info, ArrowRight, ChevronRight, Zap, Database, UserCheck } from 'lucide-react';
import { certificateService, type CertificateResponse } from '@/api/certificateService';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';

interface FormData {
  domain: string;
  email: string;
}

interface DomainValidation {
  domain: string;
  type: 'http-01' | 'dns-01';
  token: string;
  keyAuthorization: string;
  url: string;
  txtRecordName?: string;
  dnsChallenges?: { domain: string; txtRecordName: string; keyAuthorization: string }[];
  httpChallenge?: { keyAuthorization: string; token: string };
  dnsChallenge?: { txtRecordName: string; keyAuthorization: string };
}

const Index = () => {
  const [formData, setFormData] = useState<FormData>({ domain: '', email: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'validation' | 'complete'>('form');
  const [validation, setValidation] = useState<DomainValidation | null>(null);
  const [certificate, setCertificate] = useState<CertificateResponse | null>(null);
  const [requestId, setRequestId] = useState<string>('');
  const { toast } = useToast();
  const [validationMethod, setValidationMethod] = useState<'dns' | 'http'>('http');
  const [fileProtocol, setFileProtocol] = useState<'http' | 'https'>('http');
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [certCount, setCertCount] = useState(1532);

  // Simulate certificate count increment
  useEffect(() => {
    const interval = setInterval(() => {
      setCertCount(prev => prev + 1);
    }, 30000); // Increment every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getCertType = (domain: string) => domain.startsWith('*.') ? 'wildcard' : 'standard';
  const getValidationType = (domain: string, method: string): 'dns' | 'http' => {
    const isWildcard = domain.startsWith('*.');
    if (isWildcard) return 'dns';
    if (method === 'dns') return 'dns';
    return 'http';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.domain || !formData.email) {
      toast({
        title: "Missing Information",
        description: "Please enter both domain and email",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const isWildcard = formData.domain.startsWith('*.');
      const method = isWildcard ? 'dns' : validationMethod;
      const response = await certificateService.requestCertificate({
        domain: formData.domain,
        email: formData.email,
        validationType: getValidationType(formData.domain, method)
      });

      setRequestId(response.requestId);
      
      if (response.validationRequired && response.validation) {
        setValidation(response.validation);
        setCurrentStep('validation');
        toast({
          title: "Validation Required",
          description: "Please complete domain validation to proceed",
        });
      }
    } catch (error) {
      console.error('Certificate request error:', error);
      toast({
        title: "Request Failed",
        description: error instanceof Error ? error.message : "Failed to request certificate",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!requestId) return;
    
    setIsLoading(true);
    try {
      await certificateService.validateDomain(requestId);
      
      toast({
        title: "Validation Started",
        description: "Domain validation in progress... This may take a few moments",
      });

      // Poll for certificate completion
      const pollInterval = setInterval(async () => {
        try {
          const status = await certificateService.checkValidation(requestId);
          
          if (status.status === 'valid' && status.certificate) {
            clearInterval(pollInterval);
            setCertificate(status.certificate);
            setCurrentStep('complete');
            setIsLoading(false);
            toast({
              title: "Certificate Generated!",
              description: "Your SSL certificate is ready for download",
            });
          } else if (status.status === 'invalid') {
            clearInterval(pollInterval);
            setIsLoading(false);
            toast({
              title: "Validation Failed",
              description: "Please check your validation setup and try again",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Status check error:', error);
          clearInterval(pollInterval);
          setIsLoading(false);
        }
      }, 3000);

      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isLoading) {
          setIsLoading(false);
          toast({
            title: "Timeout",
            description: "Validation is taking longer than expected",
            variant: "destructive"
          });
        }
      }, 120000);

    } catch (error) {
      setIsLoading(false);
      console.error('Validation error:', error);
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : "Domain validation failed",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    });
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFormData({ domain: '', email: '' });
    setCertificate(null);
    setValidation(null);
    setCurrentStep('form');
    setRequestId('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-6 flex flex-col">
      {/* Enhanced Header */}
      <div className="text-center mb-8">
        <div className="flex flex-col items-center justify-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Lock className="h-10 w-10 text-green-600" />
            <h1 className="bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent text-4xl font-extrabold tracking-tight">
              InstaCerts.com
            </h1>
          </div>
          <p className="text-lg text-gray-600 font-medium max-w-xl">
            Get SSL certificates in minutes. Secure your website with Let's Encrypt.
          </p>
        </div>

        {/* Feature Highlights - now inline, not cards */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
          <span className="inline-flex items-center gap-2 text-green-600 text-base font-medium">
            <Zap className="h-5 w-5" />
            <span className="text-gray-700">Instant Certificate Issuance</span>
          </span>
          <span className="inline-flex items-center gap-2 text-green-600 text-base font-medium">
            <UserCheck className="h-5 w-5" />
            <span className="text-gray-700">No Login Required</span>
          </span>
          <span className="inline-flex items-center gap-2 text-green-600 text-base font-medium">
            <Database className="h-5 w-5" />
            <span className="text-gray-700">No Data Saved</span>
          </span>
        </div>

        {/* Lower row of features remains as is */}
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            <span>Free SSL Certificates</span>
          </div>
          <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-500" />
            <span>Wildcard Support</span>
          </div>
          <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Instant Validation</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl flex-1">
        {/* Powered by Let's Encrypt above the form card */}
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 text-gray-500 text-sm">
            <span>Powered by</span>
            <a 
              href="https://letsencrypt.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity duration-200"
            >
              <img 
                src="https://letsencrypt.org/images/letsencrypt-logo-horizontal.svg" 
                alt="Let's Encrypt Logo" 
                className="h-5 inline" 
                style={{ verticalAlign: 'middle' }} 
              />
            </a>
          </span>
        </div>
        {/* Form Step */}
        {currentStep === 'form' && (
          <Card className="border-2 border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-green-600" />
                Request Your SSL Certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Domain Name</label>
                    <Input
                      type="text"
                      placeholder="example.com or *.example.com"
                      value={formData.domain}
                      onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                      required
                      className="h-11 text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Email Address</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="h-11 text-base"
                    />
                  </div>
                </div>

                {formData.domain && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-3 text-xs">
                    <div className="flex gap-2 mb-2">
                      <Badge variant="secondary" className="px-2 py-0.5 text-[11px] font-medium">
                        {getCertType(formData.domain)} certificate
                      </Badge>
                      <Badge variant="outline" className="px-2 py-0.5 text-[11px] font-medium">
                        {formData.domain.startsWith('*.') ? 'DNS' : validationMethod.toUpperCase()} validation
                      </Badge>
                    </div>
                    {/* Validation method selection */}
                    {formData.domain.startsWith('*.') ? (
                      <div className="mt-1">
                        <label className="block text-[11px] font-semibold mb-1 text-gray-700">Validation Method</label>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <input type="radio" checked readOnly className="text-green-600" />
                          <span className="text-blue-700 font-semibold">DNS (CNAME) (Required for Wildcard)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <label className="block text-[11px] font-semibold mb-1 text-gray-700">Validation Method</label>
                        <div className="flex items-center gap-6 text-xs text-gray-600">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                            <input
                              type="radio"
                              name="validationMethod"
                              value="http"
                              checked={validationMethod === 'http'}
                              onChange={() => setValidationMethod('http')}
                              className="text-green-600"
                            />
                            <span className="text-xs text-gray-700">HTTP File Upload</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                            <input
                              type="radio"
                              name="validationMethod"
                              value="dns"
                              checked={validationMethod === 'dns'}
                              onChange={() => setValidationMethod('dns')}
                              className="text-green-600"
                            />
                            <span className="text-xs text-gray-700">DNS (CNAME)</span>
                          </label>
                        </div>
                      </div>
                    )}
                    {/* File Upload protocol selection */}
                    {validationMethod === 'http' && !formData.domain.startsWith('*.') && (
                      <div className="mt-2">
                        <label className="block text-[11px] font-semibold mb-1 text-gray-700">File Upload Protocol</label>
                        <div className="flex items-center gap-6 text-xs text-gray-600">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                            <input
                              type="radio"
                              name="fileProtocol"
                              value="http"
                              checked={fileProtocol === 'http'}
                              onChange={() => setFileProtocol('http')}
                              className="text-green-600"
                            />
                            <span className="text-xs text-gray-700">HTTP</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                            <input
                              type="radio"
                              name="fileProtocol"
                              value="https"
                              checked={fileProtocol === 'https'}
                              onChange={() => setFileProtocol('https')}
                              className="text-green-600"
                            />
                            <span className="text-xs text-gray-700">HTTPS</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Let's Encrypt T&C - smaller font */}
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="accept-terms"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="mt-1 text-green-600"
                    required
                  />
                  <label htmlFor="accept-terms" className="text-xs text-gray-600">
                    I agree to the <a href="https://letsencrypt.org/repository/" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 underline">Let's Encrypt Terms & Conditions</a>
                  </label>
                </div>

                <div className="space-y-2">
                  <Button 
                    type="submit" 
                    disabled={isLoading || !acceptedTerms} 
                    className="w-full h-11 bg-green-600 hover:bg-green-700 text-white text-base font-medium transition-all duration-200"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Request Certificate
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-11 border-green-600 text-green-700 hover:bg-green-50 transition-all duration-200" 
                    onClick={() => navigate(-1)}
                  >
                    Back
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Validation Step */}
        {currentStep === 'validation' && validation && (
          <Card className="border-2 border-gray-100 shadow-lg">
            <CardHeader className="border-b border-gray-100 bg-orange-50/50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Domain Validation Required
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <Alert className="bg-orange-50 border-orange-200">
                <AlertDescription className="text-orange-800">
                  To prove you own this domain, complete the validation method below:
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                {/* File Upload Instructions */}
                {validation.httpChallenge && (validationMethod === 'http' || !validationMethod) && (
                  <div className="text-sm text-blue-800 space-y-4">
                    <h3 className="font-medium text-blue-900 text-lg mb-4">File Upload Validation</h3>
                    <ol className="list-decimal ml-5 space-y-3">
                      <li>Choose {fileProtocol.toUpperCase()} file upload.</li>
                      <li>Download your Auth File:</li>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadFile(validation.httpChallenge.keyAuthorization, validation.httpChallenge.token)}
                        className="my-2 bg-white hover:bg-blue-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Auth File
                      </Button>
                      <li>Upload the Auth File to your {fileProtocol.toUpperCase()} server under:
                        <code className="block bg-blue-100 p-3 rounded text-xs font-mono break-all mt-2">
                          /.well-known/acme-challenge/
                        </code>
                      </li>
                      <li>Make sure your file is available under the following link:
                        <code className="block bg-blue-100 p-3 rounded text-xs font-mono break-all mt-2">
                          {fileProtocol}://{formData.domain}/.well-known/acme-challenge/{validation.httpChallenge.token}
                        </code>
                      </li>
                      <li>Click "Next Step" to continue.</li>
                    </ol>
                  </div>
                )}

                {/* DNS Instructions */}
                {validation.dnsChallenges ? (
                  <div className="text-sm text-blue-800 space-y-4">
                    <h3 className="font-medium text-blue-900 text-lg mb-4">DNS (CNAME) Validation</h3>
                    <ol className="list-decimal ml-5 space-y-4">
                      {validation.dnsChallenges.map((c, idx) => (
                        <li key={idx} className="mb-4">
                          <div className="mb-2">TXT record for <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">{c.domain}</code>:</div>
                          <div className="ml-4 space-y-2">
                            <div>Name: <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono">{c.txtRecordName}</code></div>
                            <div>Value: <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono break-all">{c.keyAuthorization}</code></div>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 text-sm">Add all the above TXT records to your DNS, then <b>check DNS propagation</b> before clicking "Next Step".</div>
                    <div className="mt-4 text-xs text-blue-900 bg-blue-100 p-3 rounded">
                      <b>Tip:</b> Use <a href="https://www.whatsmydns.net/" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">whatsmydns.net</a> to check if your TXT record is visible globally. Enter your TXT record name (e.g. <code>_acme-challenge.yourdomain.com</code>) and select TXT as the record type. Only click "Next Step" after you see your value appear in most locations.
                    </div>
                  </div>
                ) : validation.dnsChallenge && (validationMethod === 'dns') && (
                  <div className="text-sm text-blue-800 space-y-4">
                    <h3 className="font-medium text-blue-900 text-lg mb-4">DNS (CNAME) Validation</h3>
                    <ol className="list-decimal ml-5 space-y-4">
                      <li>Create a TXT record:</li>
                      <code className="block bg-blue-100 p-3 rounded text-xs font-mono">
                        {validation.dnsChallenge.txtRecordName}
                      </code>
                      <li>Set the value to:</li>
                      <div className="bg-blue-100 p-3 rounded text-xs font-mono break-all">
                        {validation.dnsChallenge.keyAuthorization}
                      </div>
                      <li>Click "Next Step" to continue.</li>
                    </ol>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(validation.dnsChallenge.keyAuthorization, 'Validation token')}
                      className="mt-4 bg-white hover:bg-blue-50"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Token
                    </Button>
                    <div className="mt-4 text-xs text-blue-900 bg-blue-100 p-3 rounded">
                      <b>Tip:</b> Use <a href="https://www.whatsmydns.net/" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">whatsmydns.net</a> to check if your TXT record is visible globally. Enter your TXT record name (e.g. <code>_acme-challenge.yourdomain.com</code>) and select TXT as the record type. Only click "Next Step" after you see your value appear in most locations.
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleValidate} 
                  disabled={isLoading} 
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-lg font-medium"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Validating...
                    </>
                  ) : (
                    <>
                      Next Step
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-12 border-green-600 text-green-700 hover:bg-green-50" 
                  onClick={() => navigate(-1)}
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificate Ready */}
        {currentStep === 'complete' && certificate && (
          <Card className="border-2 border-gray-100 shadow-lg">
            <CardHeader className="border-b border-gray-100 bg-green-50/50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Certificate Issued!
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="text-green-800 font-semibold text-lg mb-4">
                Your SSL certificate is ready! Download and install it on your hosting provider.
              </div>

              <div className="mb-6 text-sm text-gray-700 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-3">How to install your certificate:</h3>
                <ul className="list-disc ml-6 space-y-3">
                  <li>
                    <b>cPanel:</b> Go to SSL/TLS &gt; Manage SSL Sites, select your domain, and paste the certificate, private key, and CA bundle. 
                    <a href="https://docs.cpanel.net/cpanel/security/ssl-tls/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline ml-1">cPanel SSL Docs</a>
                  </li>
                  <li>
                    <b>GoDaddy:</b> Go to My Products &gt; SSL Certificates, select your domain, and upload the certificate files. 
                    <a href="https://www.godaddy.com/help/install-an-ssl-certificate-7230" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline ml-1">GoDaddy SSL Docs</a>
                  </li>
                  <li>
                    <b>Namecheap:</b> Go to Product List &gt; SSL Certificates, select your domain, and paste/upload the certificate and key. 
                    <a href="https://www.namecheap.com/support/knowledgebase/article.aspx/9439/2218/how-to-activate-and-install-an-ssl-certificate-in-cpanel/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline ml-1">Namecheap SSL Docs</a>
                  </li>
                  <li>
                    <b>Other hosts:</b> Look for SSL/TLS or Security settings in your control panel. Most hosts require you to paste the certificate, private key, and CA bundle (chain).
                  </li>
                </ul>
                <div className="mt-3 text-xs text-gray-600">If you need help, contact your hosting provider's support and provide them with your certificate files.</div>
              </div>

              {/* Certificate Files */}
              <div className="space-y-4">
                {[
                  { title: 'Certificate', content: certificate.certificate, filename: `${formData.domain}.crt` },
                  { title: 'Private Key', content: certificate.privateKey, filename: `${formData.domain}.key` },
                  { title: 'Certificate Chain', content: certificate.chainCertificate, filename: `${formData.domain}-chain.crt` }
                ].map((item, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardHeader className="bg-gray-50/50">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="bg-gray-100 p-4 rounded font-mono text-xs max-h-24 overflow-y-auto border">
                        {item.content.split('\n').slice(0, 3).join('\n')}
                        {item.content.split('\n').length > 3 && '\n...'}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(item.content, item.title)}
                          className="flex-1 h-10"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => downloadFile(item.content, item.filename)}
                          className="flex-1 h-10"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Download All as Zip Button */}
              <Button
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white text-lg font-medium"
                onClick={async () => {
                  const zip = new JSZip();
                  zip.file("certificate.crt", certificate.certificate);
                  zip.file("private.key", certificate.privateKey);
                  zip.file("ca_bundle.crt", certificate.chainCertificate);
                  const blob = await zip.generateAsync({ type: "blob" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "instacerts-ssl-files.zip";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-5 w-5 mr-2" />
                Download All as Zip
              </Button>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 border-green-600 text-green-700 hover:bg-green-50" 
                onClick={() => navigate(-1)}
              >
                Back
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Buy Me a Coffee */}
      <div className="flex flex-col items-center mt-8 mb-3">
        <a 
          href="https://www.buymeacoffee.com/instacert" 
          target="_blank" 
          rel="noopener noreferrer"
          className="transform hover:scale-105 transition-transform duration-200"
        >
          <img 
            src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" 
            alt="Buy Me A Coffee" 
            className="h-9" 
          />
        </a>
      </div>

      {/* Enhanced Footer */}
      <div className="text-center text-sm text-gray-500 flex flex-col items-center gap-2 pb-4">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            <span>Total Certificates Issued: {certCount.toLocaleString()}</span>
          </span>
        </div>
        <span>© {new Date().getFullYear()} InstaCerts.com - All rights reserved</span>
      </div>
    </div>
  );
};

export default Index;
