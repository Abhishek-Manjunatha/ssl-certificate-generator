
# GCP Deployment Guide for SSL Certificate Generator

This guide will help you deploy the SSL Certificate Generator on Google Cloud Platform using a Compute Engine VM.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Domain name** that you control
3. **Basic knowledge** of Linux command line

## Step-by-Step Deployment

### 1. Create a GCP VM Instance

```bash
# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Create a VM instance
gcloud compute instances create ssl-cert-generator \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-standard \
  --tags=http-server,https-server \
  --metadata-from-file startup-script=deploy/gcp/startup-script.sh
```

### 2. Configure Firewall Rules

```bash
# Allow HTTP traffic
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --source-ranges 0.0.0.0/0 \
  --target-tags http-server

# Allow HTTPS traffic
gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --target-tags https-server
```

### 3. Get VM External IP

```bash
gcloud compute instances describe ssl-cert-generator \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

### 4. Point Your Domain to the VM

Update your domain's DNS records:
- Create an **A record** pointing to your VM's external IP
- Wait for DNS propagation (up to 48 hours)

### 5. Upload Application Code

```bash
# SSH into the VM
gcloud compute ssh ssl-cert-generator --zone=us-central1-a

# Upload your code (choose one method):

# Method 1: Git clone (recommended)
cd /var/www/ssl-generator
git clone https://github.com/YOUR_USERNAME/ssl-certificate-generator.git .

# Method 2: SCP upload from local machine
# (Run this from your local machine)
gcloud compute scp --recurse . ssl-cert-generator:/var/www/ssl-generator --zone=us-central1-a
```

### 6. Deploy the Application

```bash
# SSH into the VM
gcloud compute ssh ssl-cert-generator --zone=us-central1-a

# Navigate to the application directory
cd /var/www/ssl-generator

# Make the deploy script executable
chmod +x deploy/gcp/deploy.sh

# Edit the domain in the deploy script
nano deploy/gcp/deploy.sh
# Change DOMAIN="your-domain.com" to your actual domain

# Run the deployment
./deploy/gcp/deploy.sh
```

### 7. Set Up SSL for Your Domain

```bash
# Install SSL certificate for your domain
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 8. Switch to Production Let's Encrypt

After testing with staging certificates:

```bash
# Update environment to use production Let's Encrypt
pm2 restart ssl-certificate-generator --update-env --env production
```

## Configuration Files

### Environment Variables

Create `/var/www/ssl-generator/server/.env`:

```bash
NODE_ENV=production
ACME_ENV=staging  # Change to "production" when ready
PORT=3001
```

### PM2 Ecosystem Configuration

The deployment script creates `ecosystem.config.js` automatically.

## Monitoring and Maintenance

### Check Application Status

```bash
# PM2 status
pm2 status

# Application logs
pm2 logs ssl-certificate-generator

# System resources
htop

# Nginx status
sudo systemctl status nginx

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Useful Commands

```bash
# Restart application
pm2 restart ssl-certificate-generator

# Reload Nginx configuration
sudo nginx -t && sudo systemctl reload nginx

# Check disk space
df -h

# Check memory usage
free -h

# Update system packages
sudo apt update && sudo apt upgrade -y
```

## Security Considerations

1. **Firewall**: Only necessary ports (80, 443) are open
2. **Rate Limiting**: Nginx is configured with rate limiting
3. **Security Headers**: Added in Nginx configuration
4. **Process Management**: PM2 runs the app as non-root user
5. **SSL/TLS**: Automatic HTTPS with Let's Encrypt

## Troubleshooting

### Common Issues

1. **Domain not resolving**: Check DNS propagation with `dig your-domain.com`
2. **Application not starting**: Check logs with `pm2 logs`
3. **Nginx errors**: Check config with `sudo nginx -t`
4. **SSL issues**: Verify domain ownership and DNS records

### Health Checks

The application provides a health endpoint:
```bash
curl http://localhost:3001/health
```

## Cost Estimation

**Monthly costs** (estimated):
- e2-medium VM: ~$25-30
- 20GB persistent disk: ~$3
- Network egress: ~$1-5 (depending on usage)

**Total**: ~$30-40/month

## Scaling Considerations

For higher traffic:
1. Use a larger VM instance type
2. Set up load balancing with multiple VMs
3. Use Cloud SQL for certificate request storage
4. Implement Redis for caching
5. Use Cloud CDN for static assets

## Support

For issues:
1. Check the application logs: `pm2 logs ssl-certificate-generator`
2. Check system logs: `sudo journalctl -u nginx`
3. Review this documentation
4. Check the application's health endpoint
