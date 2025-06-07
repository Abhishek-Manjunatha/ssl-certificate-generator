import { Helmet } from 'react-helmet-async';

const About = () => {
  return (
    <>
      <Helmet>
        <title>About InstaCert - Free SSL Certificate Generator | Our Mission</title>
        <meta name="description" content="Learn about InstaCert's mission to make SSL certificates accessible to everyone. We provide free, instant SSL certificate generation with Let's Encrypt integration." />
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">About InstaCert</h1>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-lg mb-4">
              At InstaCert, we believe that website security should be accessible to everyone. 
              Our mission is to simplify the process of securing websites by providing instant, 
              free SSL certificates through a user-friendly platform.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Why Choose InstaCert?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Instant Generation</h3>
                <p>Get your SSL certificate in seconds, no waiting periods or complex procedures.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">100% Free</h3>
                <p>No hidden costs or premium features. Everything we offer is completely free.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">No Registration</h3>
                <p>Start generating certificates immediately without creating an account.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">Secure & Private</h3>
                <p>We don't store your data. Your information remains private and secure.</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Our Technology</h2>
            <p className="text-lg mb-4">
              InstaCert leverages Let's Encrypt's trusted infrastructure to provide 
              industry-standard SSL certificates. Our platform is built with modern 
              technologies to ensure reliability and security.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Let's Encrypt Integration</li>
              <li>Modern Web Technologies</li>
              <li>Secure Certificate Generation</li>
              <li>Automated Validation Process</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Trust & Security</h2>
            <p className="text-lg mb-4">
              Security is at the core of everything we do. Our platform is designed 
              with best practices in mind, ensuring that your certificates are 
              generated securely and efficiently.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Get Started Today</h2>
            <p className="text-lg mb-6">
              Ready to secure your website? Start generating your free SSL certificate 
              now and join thousands of satisfied users who trust InstaCert for their 
              security needs.
            </p>
            <a 
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Generate SSL Certificate
            </a>
          </section>
        </div>
      </div>
    </>
  );
};

export default About; 