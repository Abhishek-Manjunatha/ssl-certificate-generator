
#!/bin/bash

# SSL Certificate Generator - Deployment Script for GCP

set -e

APP_DIR="/var/www/ssl-generator"
DOMAIN="your-domain.com"  # Replace with your actual domain

echo "Deploying SSL Certificate Generator..."

cd $APP_DIR

# Install dependencies
echo "Installing server dependencies..."
cd server
npm install

cd ..
echo "Installing frontend dependencies..."
npm install

# Build frontend
echo "Building frontend..."
npm run build

# Configure environment
echo "Setting up environment..."
cat > server/.env << EOF
NODE_ENV=production
ACME_ENV=staging
PORT=3001
EOF

# Setup PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'ssl-certificate-generator',
    script: './server/index.js',
    cwd: '$APP_DIR',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      ACME_ENV: 'staging'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      ACME_ENV: 'production'
    },
    log_file: '/var/log/ssl-generator/combined.log',
    out_file: '/var/log/ssl-generator/out.log',
    error_file: '/var/log/ssl-generator/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
};
EOF

# Create log directory
sudo mkdir -p /var/log/ssl-generator
sudo chown -R $USER:$USER /var/log/ssl-generator

# Configure Nginx
sudo tee /etc/nginx/sites-available/ssl-generator << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone \$binary_remote_addr zone=general:10m rate=1r/s;

    location / {
        limit_req zone=general burst=5 nodelay;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/ {
        limit_req zone=api burst=3 nodelay;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Serve ACME challenges for domain validation
    location /.well-known/acme-challenge/ {
        root /var/www/acme-challenge;
        try_files \$uri =404;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/ssl-generator /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Create ACME challenge directory
sudo mkdir -p /var/www/acme-challenge/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/acme-challenge

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Point your domain '$DOMAIN' to this server's IP address"
echo "2. Wait for DNS propagation (can take up to 48 hours)"
echo "3. Run: sudo certbot --nginx -d $DOMAIN"
echo "4. Test your application at: https://$DOMAIN"
echo ""
echo "To switch to production Let's Encrypt (after testing):"
echo "pm2 restart ssl-certificate-generator --update-env --env production"
echo ""
echo "Useful commands:"
echo "- Check logs: pm2 logs ssl-certificate-generator"
echo "- Restart app: pm2 restart ssl-certificate-generator"
echo "- Check status: pm2 status"
echo "- Check Nginx status: sudo systemctl status nginx"
