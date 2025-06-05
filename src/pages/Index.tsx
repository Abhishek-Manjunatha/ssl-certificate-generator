
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Shield, Download, Copy, CheckCircle, AlertCircle, Globe, Lock, Info } from 'lucide-react';
import { certificateService, type DomainValidation, type CertificateResponse } from '@/api/certificateService';

interface FormData {
  domain: string;
  email: string;
}

const Index = () => {
  const [formData, setFormData] = useState<FormData>({ domain: '', email: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'validation' | 'complete'>('form');
  const [validation, setValidation] = useState<DomainValidation | null>(null);
  const [certificate, setCertificate] = useState<CertificateResponse | null>(null);
  const [requestId, setRequestId] = useState<string>('');
  const { toast } = useToast();

  const getCertType = (domain: string) => domain.startsWith('*.') ? 'wildcard' : 'standard';
  const getValidationType = (domain: string) => {
    const isWildcard = domain.startsWith('*.');
    const hasSubdomain = domain.split('.').length > 2 && !isWildcard;
    return isWildcard || hasSubdomain ? 'dns' : 'http';
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
      const response = await certificateService.requestCertificate({
        domain: formData.domain,
        email: formData.email,
        validationType: getValidationType(formData.domain)
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
    const blob = new Blob([content], { type: 'text/plain' });
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">SSL Certificate Generator</h1>
          </div>
          <p className="text-gray-600">Generate free SSL certificates for your domains</p>
        </div>

        {/* Demo Notice */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            This is a demonstration of the certificate generation process. In production, this would connect to Let's Encrypt for real certificates.
          </AlertDescription>
        </Alert>

        {/* Form Step */}
        {currentStep === 'form' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Request Certificate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Domain Name</label>
                  <Input
                    type="text"
                    placeholder="example.com or *.example.com"
                    value={formData.domain}
                    onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                {formData.domain && (
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {getCertType(formData.domain)} certificate
                    </Badge>
                    <Badge variant="outline">
                      {getValidationType(formData.domain).toUpperCase()} validation
                    </Badge>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full">
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
              </form>
            </CardContent>
          </Card>
        )}

        {/* Validation Step */}
        {currentStep === 'validation' && validation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Domain Validation Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  To prove you own this domain, complete one of the validation methods below:
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-3">
                  {validation.type === 'http-01' ? 'HTTP Validation' : 'DNS Validation'}
                </h3>
                
                {validation.type === 'http-01' ? (
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>Step 1:</strong> Create a file at this URL:</p>
                    <code className="block bg-blue-100 p-2 rounded text-xs font-mono break-all">
                      http://{formData.domain}/.well-known/acme-challenge/{validation.token}
                    </code>
                    <p><strong>Step 2:</strong> Put this content in the file:</p>
                    <div className="bg-blue-100 p-2 rounded text-xs font-mono break-all">
                      {validation.keyAuthorization}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-blue-800 space-y-2">
                    <p><strong>Step 1:</strong> Create a TXT record:</p>
                    <code className="block bg-blue-100 p-2 rounded text-xs font-mono">
                      _acme-challenge.{formData.domain}
                    </code>
                    <p><strong>Step 2:</strong> Set the value to:</p>
                    <div className="bg-blue-100 p-2 rounded text-xs font-mono break-all">
                      {validation.keyAuthorization}
                    </div>
                  </div>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(validation.keyAuthorization, 'Validation token')}
                  className="mt-3"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Token
                </Button>
              </div>

              <Button onClick={handleValidate} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Validating...
                  </>
                ) : (
                  'Validate & Generate Certificate'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Certificate Ready */}
        {currentStep === 'complete' && certificate && (
          <div className="space-y-6">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-green-800">Certificate Ready!</h2>
                    <p className="text-green-600 text-sm">
                      Valid until: {new Date(certificate.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificate Files */}
            {[
              { title: 'Certificate', content: certificate.certificate, filename: `${formData.domain}.crt` },
              { title: 'Private Key', content: certificate.privateKey, filename: `${formData.domain}.key` },
              { title: 'Certificate Chain', content: certificate.chainCertificate, filename: `${formData.domain}-chain.crt` }
            ].map((item, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-100 p-3 rounded font-mono text-xs max-h-24 overflow-y-auto border">
                    {item.content.split('\n').slice(0, 3).join('\n')}
                    {item.content.split('\n').length > 3 && '\n...'}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(item.content, item.title)}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadFile(item.content, item.filename)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="text-center">
              <Button onClick={resetForm} variant="outline" size="lg">
                Generate Another Certificate
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
