# Villa Paris Gestionale - LXC Installation Guide

## 🚀 One-Liner Install (Proxmox VE)

Esegui questo comando sul nodo Proxmox come root:

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Dis-Astro/villa-paris-gestionale/develop/scripts/proxmox/install-lxc.sh)"
```

### Alternativa con curl:
```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Dis-Astro/villa-paris-gestionale/develop/scripts/proxmox/install-lxc.sh)"
```

### Installazione da release tar.gz:
```bash
wget https://github.com/Dis-Astro/villa-paris-gestionale/releases/latest/download/install-lxc.sh
chmod +x install-lxc.sh
./install-lxc.sh
```

---

## 📋 Requisiti

- **Proxmox VE** 7.x o 8.x
- **Storage** con almeno 10GB liberi
- **Network** bridge configurato (vmbr0)
- **Template** Ubuntu 22.04 (scaricato automaticamente)

---

## ⚙️ Configurazione Interattiva

L'installer ti chiederà:

| Parametro | Default | Descrizione |
|-----------|---------|-------------|
| CTID | Auto | ID del container |
| Hostname | villaparis | Nome host |
| CPU | 2 | Numero core |
| RAM | 2048 MB | Memoria |
| Disk | 8 GB | Spazio disco |
| Network | DHCP | IP automatico o statico |
| HTTP Port | 3000 | Porta web |
| Database | SQLite | SQLite o PostgreSQL |

---

## 🔑 Credenziali Default

### Database SQLite (default)
- Nessuna credenziale richiesta
- File: `/opt/villaparis/prisma/prod.db`

### Database PostgreSQL (opzionale)
- **User:** `villaparis`
- **Password:** `villaparis_secure_2026`
- **Database:** `villaparis`

---

## 🖥️ Comandi Post-Installazione

### Entrare nel container
```bash
pct enter <CTID>
```

### Controllare lo stato del servizio
```bash
systemctl status villaparis
```

### Visualizzare i log in tempo reale
```bash
journalctl -u villaparis -f
```

### Riavviare il servizio
```bash
systemctl restart villaparis
```

---

## 🔄 Aggiornamento

### One-liner update (da eseguire dentro il container)
```bash
cd /opt/villaparis && git pull && yarn install && npx prisma migrate deploy && yarn build && systemctl restart villaparis
```

### Script di aggiornamento
```bash
#!/bin/bash
cd /opt/villaparis
git pull origin develop
yarn install
npx prisma generate
npx prisma migrate deploy
yarn build
systemctl restart villaparis
echo "Update complete!"
```

---

## 🔧 Troubleshooting

### Il servizio non parte
```bash
# Verifica errori
journalctl -u villaparis -n 100 --no-pager

# Verifica porta in uso
ss -tlnp | grep 3000

# Riavvia manualmente
cd /opt/villaparis && yarn start
```

### Errori di database
```bash
# SQLite - Reset database
cd /opt/villaparis
rm -f prisma/prod.db
npx prisma db push

# PostgreSQL - Verifica connessione
sudo -u postgres psql -c "\\l"
```

### Errori di build
```bash
# Pulisci cache e ricostruisci
cd /opt/villaparis
rm -rf .next node_modules
yarn install
yarn build
```

### Network non funziona
```bash
# Verifica IP
ip addr show eth0

# Riavvia networking
systemctl restart systemd-networkd
```

---

## 📁 Struttura File

```
/opt/villaparis/
├── .env                 # Configurazione ambiente
├── .next/               # Build Next.js
├── prisma/
│   ├── schema.prisma    # Schema database
│   └── prod.db          # Database SQLite (se usato)
├── src/                 # Codice sorgente
└── package.json         # Dipendenze

/etc/systemd/system/
└── villaparis.service   # Unit systemd
```

---

## 🔒 Sicurezza

### Firewall (opzionale)
```bash
# Consenti solo porta app
ufw allow 3000/tcp
ufw enable
```

### Reverse Proxy con Nginx
```nginx
server {
    listen 80;
    server_name villaparis.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL con Certbot
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d villaparis.example.com
```

---

## 📞 Supporto

- **Repository:** https://github.com/Dis-Astro/villa-paris-gestionale
- **Issues:** https://github.com/Dis-Astro/villa-paris-gestionale/issues
