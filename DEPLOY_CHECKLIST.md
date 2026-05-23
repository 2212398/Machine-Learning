# Checklist Deploy VPS

## Lan dau setup tren VPS moi

- [ ] Cai Docker va Docker Compose tren VPS
- [ ] Clone repo: `git clone <repo-url>`
- [ ] Copy env: `cp code/.env.example code/.env`
- [ ] Dien gia tri that vao `code/.env`
- [ ] Copy frontend env: `cp code/frontend/.env.example code/frontend/.env.local`
- [ ] Dien gia tri frontend vao `.env.local`
- [ ] Cau hinh domain trong `nginx/default.conf`
- [ ] Chay certbot lay SSL: `./nginx/certbot/init-letsencrypt.sh`
- [ ] Build va khoi dong: `cd code && docker compose up -d --build`
- [ ] Kiem tra health: `curl https://your-domain.com/api/health`

## Moi lan deploy update

- [ ] `git pull origin main`
- [ ] Chay: `bash code/scripts/deploy-frontend.sh`
- [ ] Xac nhan: `curl https://your-domain.com/api/health` tra ve `{"status":"ok"}`
- [ ] Kiem tra trang landing hien thi dung
- [ ] Test upload 1 anh va co ket qua chan doan

## Sau khi deploy - theo doi 30 phut dau

- [ ] `docker compose logs -f frontend` khong co `ERROR`
- [ ] `docker compose logs -f backend` model loaded OK
- [ ] `docker stats` RAM frontend < 512MB, backend < 4GB
- [ ] Test dang nhap, chan doan, xem lich su
