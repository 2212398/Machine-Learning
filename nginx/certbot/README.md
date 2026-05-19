# Certbot webroot for ACME challenge

Place for certbot to write ACME challenge files when using the webroot plugin.

Obtain a certificate (run from project root):

```powershell
docker compose run --rm certbot "certonly --webroot --webroot-path=/var/www/certbot -d yourdomain.example -m you@example.com --agree-tos --no-eff-email"
```

Renew certificates manually:

```powershell
docker compose run --rm certbot "renew --webroot --webroot-path=/var/www/certbot"
```

After obtaining certs, ensure `/etc/letsencrypt` is populated on the host (or adjust mounts) so `nginx` can read them.

Notes:
- Replace `yourdomain.example` and `you@example.com` with your real domain and email.
- The `nginx/default.conf` currently references `/etc/letsencrypt/live/example.com/...` — update it to your domain or keep the same path structure after obtaining certs.
- For automatic renewal, consider running a scheduled task or a small container that calls `certbot renew` periodically.
