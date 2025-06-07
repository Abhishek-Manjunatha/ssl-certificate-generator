# Namecheap Deployment Guide

This guide will help you deploy the SSL Certificate Generator to your Namecheap hosting account.

## Prerequisites

1. Namecheap hosting account
2. Access to cPanel
3. Node.js installed on your local machine
4. Git installed on your local machine

## Step 1: Prepare Your Application

1. Build the frontend:
```bash
npm run build
```

2. Create a production environment file:
```bash
# Create .env.production in the server directory
NODE_ENV=production
ACME_ENV=production
PORT=3001
```

## Step 2: Set Up Your Subdomain

1. Log in to your Namecheap account
2. Go to cPanel
3. Find "Subdomains" under "Domains"
4. Create a new subdomain:
   - Subdomain: instacert
   - Domain: illwell.in
   - Document Root: public_html/instacert

## Step 3: Upload Your Application

1. Connect to your hosting via FTP:
   - Host: ftp.illwell.in
   - Username: Your cPanel username
   - Password: Your cPanel password
   - Port: 21

2. Navigate to the subdomain directory:
   ```
   public_html/instacert
   ```

3. Upload the following files:
   - All contents of the `dist` folder (frontend build)
   - The `server` folder
   - `package.json`
   - `.env.production`

## Step 4: Configure Node.js in cPanel

1. In cPanel, find "Setup Node.js App"
2. Click "Create Application"
3. Configure the application:
   - Node.js version: 16.x or higher
   - Application mode: Production
   - Application root: /public_html/instacert
   - Application URL: https://instacert.illwell.in
   - Application startup file: server/index.js
   - Environment variables:
     ```
     NODE_ENV=production
     ACME_ENV=production
     PORT=3001
     ```

## Step 5: Set Up SSL Certificate

1. In cPanel, find "SSL/TLS"
2. Click "Install SSL Certificate"
3. Choose "Let's Encrypt SSL"
4. Select your domain: instacert.illwell.in
5. Complete the installation

## Step 6: Configure .htaccess

Create a `.htaccess` file in your subdomain root with:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]

# Proxy API requests to Node.js
RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]
```

## Step 7: Start the Application

1. In cPanel's Node.js App section:
   - Click "Run JS Script"
   - Enter: `npm install`
   - Click "Run"
   - Wait for installation to complete

2. Start the application:
   - Click "Start" in the Node.js App section
   - Or use the command: `npm start`

## Step 8: Verify Deployment

1. Visit your subdomain: https://instacert.illwell.in
2. Test the following:
   - Frontend loads correctly
   - Admin login works
   - Certificate generation works
   - SSL is working

## Troubleshooting

1. If the application doesn't start:
   - Check the Node.js logs in cPanel
   - Verify all environment variables
   - Check file permissions

2. If the frontend doesn't load:
   - Check the .htaccess configuration
   - Verify the build files are uploaded
   - Check browser console for errors

3. If API calls fail:
   - Verify the proxy configuration
   - Check Node.js is running
   - Check API logs

## Maintenance

1. To update the application:
   - Build the frontend again
   - Upload the new dist folder
   - Restart the Node.js application

2. To check logs:
   - Use cPanel's Node.js App logs
   - Check error logs in cPanel

3. To backup:
   - Download the entire subdomain directory
   - Export any database data if used

## Security Considerations

1. Keep Node.js updated
2. Use strong passwords
3. Enable SSL for all connections
4. Regularly check logs for issues
5. Keep dependencies updated

## Support

If you encounter issues:
1. Check the application logs
2. Verify all configurations
3. Contact Namecheap support if needed
4. Check the application's health endpoint: https://instacert.illwell.in/health 