# Cotizador LAS NY CONSTRUCCION COMPANY

App móvil de cotizaciones con historial compartido (tú y tu novio ven las mismas
cotizaciones desde cualquier celular).

## Qué incluye
- `public/index.html` — el formulario (partidas, IVA, firma precargada, PDF, historial).
- `server.js` — servidor Node/Express, guarda el historial en `data/cotizaciones.json`.
- `ecosystem.config.js` — configuración de `pm2`, aquí defines el usuario/contraseña de acceso.
- `.gitignore` — ya excluye `node_modules/`, `data/` y `.env`, para que nunca subas
  el historial real ni credenciales de producción a GitHub por accidente.

## 1. Subirlo a GitHub
```
cd cotizador-app
git init
git add .
git commit -m "Cotizador LAS NY"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```
Si el repo va a ser público, no dejes ahí tu usuario/contraseña reales — súbelo con los
valores de ejemplo (`CAMBIA_ESTE_USUARIO`) y cámbialos directo en el VPS en el paso 3.
Si el repo es privado, no hay problema en dejarlos ya puestos.

## 2. Jalarlo al VPS
Conéctate por SSH al VPS y clona el repo:
```
git clone https://github.com/TU_USUARIO/TU_REPO.git cotizador-app
cd cotizador-app
npm install --production
```

## 3. Configurar usuario y contraseña
Abre `ecosystem.config.js` y cambia `CAMBIA_ESTE_USUARIO` / `CAMBIA_ESTA_CONTRASENA`
por lo que van a usar tú y tu novio para entrar al sitio.

## 4. Arrancarlo con pm2 (se queda corriendo solo)
```
npm install -g pm2      # una sola vez en el VPS
pm2 start ecosystem.config.js
pm2 save
pm2 startup             # sigue las instrucciones que imprime en pantalla
```

## 5. (Recomendado) Dominio + HTTPS con Nginx
```
server {
    listen 80;
    server_name tudominio.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```
Luego `certbot --nginx` para HTTPS gratis (Let's Encrypt).

## Actualizar la app después (nuevos cambios en el código)
En el VPS:
```
cd cotizador-app
git pull
npm install --production
pm2 restart cotizador-lasny
```
`data/` está en `.gitignore`, así que el historial real que ya guardaron **no se toca**
al hacer `git pull` — solo se actualiza el código.

## Notas
- El historial vive en un archivo (`data/cotizaciones.json`), no en una base de datos —
  suficiente para el volumen de un negocio pequeño. Si crece mucho, se puede migrar a
  SQLite sin tocar el formulario.
- Haz respaldo periódico de `data/cotizaciones.json` (por ejemplo, copiándolo a Drive una
  vez por semana). Como no vive en GitHub, si el VPS se pierde sin respaldo, se pierde
  el historial completo.
