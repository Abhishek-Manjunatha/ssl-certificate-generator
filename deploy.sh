#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print with color
print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

print_error() {
    echo -e "${RED}Error:${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root"
    exit 1
fi

# Update system
print_step "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js and npm
print_step "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
print_step "Installing PM2..."
npm install -g pm2

# Install nginx
print_step "Installing nginx..."
apt-get install -y nginx

# Create application directory
print_step "Creating application directory..."
APP_DIR="/opt/ssl-certificate-generator"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository
print_step "Cloning repository..."
git clone https://github.com/Abhishek-Manjunatha/ssl-certificate-generator.git .
chown -R $SUDO_USER:$SUDO_USER $APP_DIR

# Install frontend dependencies and build
print_step "Installing frontend dependencies and building..."
cd $APP_DIR
npm install
npm run build

# Install backend dependencies
print_step "Installing backend dependencies..."
cd $APP_DIR/server
npm install

# Create environment files
print_step "Creating environment files..."

# Frontend .env
cat > $APP_DIR/.env << EOL
VITE_API_URL=http://localhost:3001
VITE_APP_TITLE=SSL Certificate Generator
VITE_APP_DESCRIPTION=Generate SSL certificates using Let's Encrypt ACME protocol
EOL

# Backend .env
cat > $APP_DIR/server/.env << EOL
PORT=3001
NODE_ENV=production
ADMIN_PASSCODE=admin123
JWT_SECRET=your-secret-key-here
EOL

# Configure nginx
print_step "Configuring nginx..."
cat > /etc/nginx/sites-available/ssl-cert-generator << EOL
server {
    listen 80;
    server_name _;  # Replace with your domain if available

    location / {
        root $APP_DIR/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

# Enable nginx site
ln -sf /etc/nginx/sites-available/ssl-cert-generator /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx

# Start application with PM2
print_step "Starting application with PM2..."
cd $APP_DIR/server
pm2 start index.js --name "ssl-cert-generator"
pm2 save

# Enable PM2 startup script
pm2 startup

print_step "Installation completed successfully!"
echo -e "${GREEN}The application is now running at:${NC}"
echo "Frontend: http://localhost"
echo "Backend API: http://localhost:3001"
echo -e "\n${YELLOW}Important:${NC}"
echo "1. Default admin passcode: admin123"
echo "2. Please change the admin passcode after first login"
echo "3. Update the JWT_SECRET in server/.env for production"
echo -e "\nTo check application status:"
echo "pm2 status"
echo -e "\nTo view logs:"
echo "pm2 logs ssl-cert-generator" 