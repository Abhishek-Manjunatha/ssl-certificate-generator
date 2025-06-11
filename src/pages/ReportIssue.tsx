import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';

const ReportIssue = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Send email using EmailJS
      const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        subject: formData.subject,
        message: formData.description,
        to_email: 'abhishekgm.in@gmail.com'
      };

      await emailjs.send(
        'service_7nt1r68',
        'template_fqwh3xp',
        templateParams,
        'EOdrS9hWnnDO--DQk'
      );
      
      toast({
        title: "Issue Reported",
        description: "Thank you for your feedback. We'll look into this issue.",
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        description: ''
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to submit issue. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-6">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="border-2 border-gray-100 shadow-lg">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Report an Issue
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Your Name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Email Address</label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Subject</label>
                  <Input
                    type="text"
                    placeholder="Brief description of the issue"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    required
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                  <Textarea
                    placeholder="Please provide detailed information about the issue..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                    className="min-h-[150px]"
                  />
                </div>
              </div>

              <Alert className="bg-orange-50 border-orange-200">
                <AlertDescription className="text-orange-800">
                  Please provide as much detail as possible to help us understand and resolve the issue quickly.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Issue
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-11 border-green-600 text-green-700 hover:bg-green-50" 
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportIssue; 