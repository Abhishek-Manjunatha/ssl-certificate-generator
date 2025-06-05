
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Download, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Globe, 
  Lock,
  Zap,
  Timer,
  Sparkles
} from 'lucide-react';

interface CertificateData {
  certificate: string;
  privateKey: string;
  chainCertificate: string;
  expiryDate: string;
}

const Index = () => {
  const [domain, setDomain] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [certType, setCertType] = useState<'standard' | 'wildcard'>('standard');
  const [validationType, setValidationType] = useState<'http' | 'dns'>('http');
  const { toast } = useToast();

  // Auto-detect certificate type and validation method
  useEffect(() => {
    if (domain) {
      const isWildcard = domain.startsWith('*.');
      const hasSubdomain = domain.split('.').length > 2 && !isWildcard;
      
      setCertType(isWildcard ? 'wildcard' : 'standard');
      setValidationType(isWildcard || hasSubdomain ? 'dns' : 'http');
    }
  }, [domain]);

  const simulateGeneration = async () => {
    if (!domain) {
      toast({
        title: "Domain Required",
        description: "Please enter a valid domain name",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    
    const steps = [
      'Validating domain...',
      'Requesting certificate...',
      'Performing domain verification...',
      'Generating certificate...',
      'Finalizing...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(steps[i]);
      setProgress((i + 1) * 20);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Simulate certificate generation
    const mockCert: CertificateData = {
      certificate: `-----BEGIN CERTIFICATE-----
MIIFXzCCBEegAwIBAgISA7V8Qq0Fm5Yc9vGHm5xvhY9LMA0GCSqGSIb3DQEBCwUA
MDIxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQswCQYDVQQD
EwJSMzAeFw0yMzEyMDEwMDAwMDBaFw0yNDAyMjkyMzU5NTlaMBgxFjAUBgNVBAMT
DWV4YW1wbGUuY29tLnVzMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
...certificate content...
-----END CERTIFICATE-----`,
      privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDHjzG8Qq0Fm5Yc
9vGHm5xvhY9LMA0GCSqGSIb3DQEBCwUAMDIxCzAJBgNVBAYTAlVTMRYwFAYDVQQK
...private key content...
-----END PRIVATE KEY-----`,
      chainCertificate: `-----BEGIN CERTIFICATE-----
MIIFFQTCCB6mgAwIBAgIRAJx+2hAXxo9TZgWjuEFOAoIwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
...chain certificate content...
-----END CERTIFICATE-----`,
      expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    };

    setCertificateData(mockCert);
    setIsGenerating(false);
    setProgress(100);
    setCurrentStep('Certificate generated successfully!');

    toast({
      title: "Certificate Generated!",
      description: `SSL certificate for ${domain} is ready for download`,
    });
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
    setDomain('');
    setCertificateData(null);
    setProgress(0);
    setCurrentStep('');
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Shield className="h-12 w-12 text-emerald-400" />
              <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              InstaCerts
            </h1>
          </div>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Generate free Let's Encrypt SSL certificates instantly. No registration, no storage, just secure certificates.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {!certificateData ? (
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Globe className="h-5 w-5 text-emerald-400" />
                  Domain Certificate Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Domain Name
                    </label>
                    <Input
                      type="text"
                      placeholder="example.com or *.example.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-400"
                      disabled={isGenerating}
                    />
                  </div>

                  {domain && (
                    <div className="flex gap-4 p-4 bg-slate-700/30 rounded-lg animate-fade-in">
                      <div className="flex items-center gap-2">
                        <Badge variant={certType === 'wildcard' ? 'default' : 'secondary'} className="bg-purple-600">
                          {certType === 'wildcard' ? 'Wildcard' : 'Standard'} Certificate
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={validationType === 'dns' ? 'default' : 'secondary'} className="bg-blue-600">
                          {validationType.toUpperCase()} Validation
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                {isGenerating && (
                  <div className="space-y-4 animate-fade-in">
                    <Progress value={progress} className="h-3" />
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Zap className="h-4 w-4 animate-pulse" />
                      <span className="text-sm">{currentStep}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={simulateGeneration}
                  disabled={!domain || isGenerating}
                  className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold py-3 transition-all duration-300 hover:scale-105"
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating Certificate...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Generate SSL Certificate
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Success Header */}
              <Card className="bg-emerald-900/20 border-emerald-500/30 backdrop-blur-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                    <div>
                      <h2 className="text-2xl font-bold text-white">Certificate Generated!</h2>
                      <p className="text-emerald-300">Your SSL certificate for {domain} is ready</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-300">
                    <div className="flex items-center gap-1">
                      <Timer className="h-4 w-4" />
                      Expires: {new Date(certificateData.expiryDate).toLocaleDateString()}
                    </div>
                    <Badge className="bg-emerald-600">
                      Valid for 90 days
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Certificate Files */}
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { title: 'Certificate', content: certificateData.certificate, filename: `${domain}.crt` },
                  { title: 'Private Key', content: certificateData.privateKey, filename: `${domain}.key` },
                  { title: 'Chain Certificate', content: certificateData.chainCertificate, filename: `${domain}-chain.crt` }
                ].map((item, index) => (
                  <Card key={index} className="bg-slate-800/50 border-slate-700 backdrop-blur-lg hover:bg-slate-800/70 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-slate-900/50 p-3 rounded text-xs text-slate-300 font-mono max-h-32 overflow-y-auto">
                        {item.content.split('\n').slice(0, 5).join('\n')}
                        {item.content.split('\n').length > 5 && '\n...'}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(item.content, item.title)}
                          className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(item.content, item.filename)}
                          className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-center">
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Generate Another Certificate
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: Zap, title: 'Instant Generation', desc: 'Get your SSL certificate in seconds' },
            { icon: Shield, title: 'Secure & Trusted', desc: 'Official Let\'s Encrypt certificates' },
            { icon: Globe, title: 'No Storage', desc: 'We don\'t store your certificates or data' }
          ].map((feature, index) => (
            <Card key={index} className="bg-slate-800/30 border-slate-700 backdrop-blur-lg hover:bg-slate-800/50 transition-all duration-300 hover:scale-105">
              <CardContent className="pt-6 text-center">
                <feature.icon className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-300 text-sm">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
