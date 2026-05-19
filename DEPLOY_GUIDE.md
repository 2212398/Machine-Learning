# VPS Deployment Guide

**VPS IP:** `178.128.50.119`  
**Project:** Plant Leaf Disease Detection  
**Date:** 2026-05-18

## Step 1: Connect to VPS via SSH

```bash
# Windows (Git Bash or PowerShell):
ssh root@178.128.50.119

# Or if you have an SSH key:
ssh -i your_key.pem root@178.128.50.119
```

When prompted for password, enter the VPS root password.

## Step 2: Update System and Install Docker

```bash
# Update package lists
apt update && apt upgrade -y

# Install Docker and Docker Compose
apt install -y docker.io docker-compose git curl wget

# Start Docker service
systemctl start docker
systemctl enable docker

# Verify Docker works
docker --version
docker compose --version
```

## Step 3: Clone Project Repository

```bash
# Navigate to home directory
cd /root

# Clone the repository
git clone https://github.com/2212398/Machine-Learning.git
cd Machine-Learning
```

## Step 4: Obtain SSL Certificate with Let's Encrypt

First, set an A record pointing your domain to this IP.

Then request a certificate:

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Request certificate (replace your-domain.com)
certbot certonly --standalone -d your-domain.com -m you@example.com --agree-tos --no-eff-email

# Verify certificate location
ls -la /etc/letsencrypt/live/your-domain.com/
```

## Step 5: Create Environment File

```bash
# Create .env file in /root/Machine-Learning/
cat > .env << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_FASTAPI_URL=https://your-domain.com/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DEVICE=cpu
ALLOWED_ORIGINS=https://your-domain.com
EOF
```

## Step 6: Update Nginx Config with Your Domain

Edit `nginx/default.conf` and replace `example.com` with your actual domain:

```bash
sed -i 's|example.com|your-domain.com|g' nginx/default.conf
```

Or manually edit:

```bash
nano nginx/default.conf
```

Change:
```nginx
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

## Step 7: Ensure Model Files Exist

```bash
# Check if models are present
ls -la backend/app/models/

# They should be:
# - plant_mobilenetv3.pt
# - disease_mobilenetv3.pt

# If missing, you must copy them from your local machine:
scp -r plant_mobilenetv3.pt root@178.128.50.119:/root/plant-disease-detection/code/backend/app/models/
scp -r disease_mobilenetv3.pt root@178.128.50.119:/root/plant-disease-detection/code/backend/app/models/
```

## Step 8: Build and Start Docker Containers

```bash
# From /root/Machine-Learning/
docker compose up --build -d

# Check if containers are running
docker compose ps

# View logs
docker compose logs -f
```

## Step 9: Test the Deployment

```bash
# From your local machine:
curl -k https://178.128.50.119/
# Should return Next.js frontend HTML or redirect

curl -k https://178.128.50.119/api/health
# Should return API status

# Or in browser:
# https://your-domain.com  (once domain is pointed to the IP)
```

## Step 10: Set Up Automatic Certificate Renewal

```bash
# Add certbot renewal to cron
(crontab -l 2>/dev/null; echo "0 2 1 * * certbot renew --quiet && docker compose -f /root/Machine-Learning/docker-compose.yml kill -s HUP nginx") | crontab -
```

## Troubleshooting

### Port 80/443 Already in Use
```bash
# Check what's using the ports
netstat -tlnp | grep ':80\|:443'

# Stop conflicting service (if needed)
systemctl stop apache2  # or nginx if already installed
```

### Models Not Found at Runtime
```bash
# Verify models are mounted properly
docker compose exec backend ls -la /app/backend/app/models/

# If missing, copy to correct location and restart
docker compose restart backend
```

### Certificate Issues
```bash
# Check certificate validity
certbot certificates

# Renew manually if needed
certbot renew --force-renewal -d your-domain.com
```

### View Live Logs
```bash
docker compose logs backend -f
docker compose logs frontend -f
docker compose logs nginx -f
```

## Monitoring

```bash
# Check container health
docker compose ps

# View resource usage
docker stats

# Check disk space
df -h
```

## Backup and Restore

```bash
# Backup Supabase database exports
docker compose exec backend cat /app/training/retraining_exports/*.csv | gzip > backup.tar.gz

# Backup entire /etc/letsencrypt (for certs)
tar -czf letsencrypt-backup.tar.gz /etc/letsencrypt/
```

## Post-Deployment Checklist

- [ ] SSH access working to 178.128.50.119
- [ ] Docker and Docker Compose installed
- [ ] Git repo cloned
- [ ] Model files copied to `backend/app/models/`
- [ ] `.env` file created with correct Supabase/domain values
- [ ] Domain A record points to 178.128.50.119
- [ ] SSL certificate obtained via Let's Encrypt
- [ ] `nginx/default.conf` updated with domain name
- [ ] Docker containers built and running
- [ ] Frontend accessible via HTTPS
- [ ] Backend API responding at `/api/health`
- [ ] Supabase Auth, Database, Storage working
- [ ] Certificate renewal cron job set up

## Support

If issues arise, check logs:
```bash
cd /root/Machine-Learning
docker compose logs -f
```

Commit the deployment details to your repo's `DEPLOY.md` or keep them in `.env.example` for the next team member.
