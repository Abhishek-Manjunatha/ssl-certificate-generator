
#!/bin/bash

# SSL Certificate Generator - GCP VM Startup Script
# This script sets up a production environment on Google Cloud Platform

set -e

echo "Starting SSL Certificate Generator setup..."

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Install Certbot for initial SSL setup
sudo apt-get install -y certbot python3-certbot-nginx

# Create application directory
sudo mkdir -p /var/www/ssl-generator
cd /var/www/ssl-generator

# Clone repository (replace with your actual repository URL)
# git clone https://github.com/your-username/ssl-certificate-generator.git .

# For now, create the directory structure
sudo mkdir -p server dist

# Set ownership
sudo chown -R $USER:$USER /var/www/ssl-generator

echo "Basic setup completed. Please upload your application files."
echo "Next steps:"
echo "1. Upload your application code to /var/www/ssl-generator"
echo "2. Run the deployment script: ./deploy/gcp/deploy.sh"
