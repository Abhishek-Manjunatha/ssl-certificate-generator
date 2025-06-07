# SSL Certificate Generator

A modern web application for generating SSL certificates using Let's Encrypt ACME protocol. Built with React, TypeScript, and Node.js.

## Features

- Generate SSL certificates for domains and subdomains
- Support for wildcard certificates
- Multiple validation methods (DNS, HTTP, HTTPS)
- Admin dashboard for monitoring and management
- Real-time certificate generation status
- Secure certificate storage
- Modern, responsive UI

## Tech Stack

- **Frontend:**
  - React
  - TypeScript
  - Vite
  - Shadcn UI
  - React Router
  - React Query

- **Backend:**
  - Node.js
  - Express
  - ACME Client
  - PM2 (Production)

## Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- Git

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ssl-certificate-generator.git
   cd ssl-certificate-generator
   ```

2. Install dependencies:
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd server
   npm install
   ```

3. Set up environment variables:
   ```bash
   # In the server directory
   cp .env.example .env
   ```

4. Start the development servers:
   ```bash
   # Start frontend (in project root)
   npm run dev

   # Start backend (in server directory)
   npm run dev
   ```

## Development

- Frontend runs on: http://localhost:8080
- Backend runs on: http://localhost:3001
- Admin dashboard: http://localhost:8080/admin

## Production Deployment

See the deployment guides in the `deploy` directory:
- [GCP Deployment Guide](deploy/gcp/README.md)
- [Namecheap Deployment Guide](deploy/namecheap/README.md)

## Project Structure

```
ssl-certificate-generator/
├── src/                    # Frontend source code
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── api/              # API integration
│   └── utils/            # Utility functions
├── server/               # Backend source code
│   ├── routes/          # API routes
│   └── utils/           # Server utilities
├── public/              # Static assets
└── deploy/             # Deployment configurations
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.
