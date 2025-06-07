import { Helmet } from 'react-helmet-async';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "What is an SSL Certificate?",
    answer: "An SSL (Secure Sockets Layer) certificate is a digital certificate that authenticates a website's identity and enables an encrypted connection. It's essential for securing data transfer between a user's browser and the website server."
  },
  {
    question: "Why do I need an SSL Certificate?",
    answer: "SSL certificates are crucial for website security. They encrypt data transmission, protect user information, build trust with visitors, and improve your website's SEO ranking. Modern browsers also mark non-HTTPS sites as 'not secure'."
  },
  {
    question: "How does InstaCert's free SSL certificate work?",
    answer: "InstaCert generates free SSL certificates using Let's Encrypt's infrastructure. Simply enter your domain name, and we'll generate a valid SSL certificate instantly. No registration or payment required."
  },
  {
    question: "Is the SSL certificate really free?",
    answer: "Yes, our SSL certificates are completely free. We don't charge any fees, and there are no hidden costs or premium features. We believe in making website security accessible to everyone."
  },
  {
    question: "How long does it take to generate a certificate?",
    answer: "Certificate generation is instant. Once you enter your domain name, you'll receive your SSL certificate within seconds. No waiting periods or complex procedures."
  },
  {
    question: "Do you store any of my data?",
    answer: "No, we don't store any of your data. Your information is only used during the certificate generation process and is not saved on our servers. We prioritize your privacy and security."
  },
  {
    question: "How do I install the SSL certificate?",
    answer: "After generating your certificate, you'll receive detailed installation instructions. The process varies depending on your hosting provider and server setup, but we provide clear guidance for common platforms."
  },
  {
    question: "What is Let's Encrypt?",
    answer: "Let's Encrypt is a non-profit certificate authority that provides free SSL certificates. It's trusted by major browsers and is the standard for free SSL certificates. InstaCert uses Let's Encrypt's infrastructure to generate certificates."
  },
  {
    question: "How long is the certificate valid?",
    answer: "Our SSL certificates are valid for 90 days, which is the standard validity period for Let's Encrypt certificates. You can easily generate a new certificate before expiration."
  },
  {
    question: "Do you offer support for certificate installation?",
    answer: "While we don't provide direct installation support, we offer comprehensive documentation and guides to help you install your SSL certificate. Our FAQ and help resources cover most common installation scenarios."
  }
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      <Helmet>
        <title>SSL Certificate FAQ | Common Questions About Free SSL Certificates</title>
        <meta name="description" content="Find answers to common questions about SSL certificates, our free SSL generator, and certificate installation. Learn everything you need to know about securing your website." />
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Frequently Asked Questions</h1>
          
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div 
                key={index}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 focus:outline-none"
                  onClick={() => toggleFAQ(index)}
                >
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">{item.question}</h2>
                    <span className="text-gray-500">
                      {openIndex === index ? '−' : '+'}
                    </span>
                  </div>
                </button>
                
                {openIndex === index && (
                  <div className="px-6 py-4 bg-gray-50">
                    <p className="text-gray-700">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <h2 className="text-2xl font-semibold mb-4">Still have questions?</h2>
            <p className="text-lg mb-6">
              Can't find what you're looking for? Contact us and we'll help you out.
            </p>
            <a 
              href="/contact"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQ; 