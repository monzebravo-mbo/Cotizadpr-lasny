// Servidor del Cotizador LAS NY CONSTRUCCION COMPANY
// Sirve el formulario y guarda el historial de cotizaciones en un archivo JSON
// compartido, para que se vea igual desde cualquier celular que entre a la URL del VPS.

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'cotizaciones.json');

// ---- Autenticación con pantalla de login propia ----
// Si defines APP_USER y APP_PASS (como variables de entorno, o en ecosystem.config.js),
// el sitio pide usuario/contraseña con la pantalla de public/login.html antes de dejar
// entrar. Si no las defines, el sitio queda abierto a quien tenga la URL.
const APP_USER = process.env.APP_USER;
const APP_PASS = process.env.APP_PASS;
const COOKIE_NAME = 'lasny_session';
const SESION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

// Sesiones activas en memoria: token -> fecha de expiración.
// Suficiente para un solo proceso pm2 con un par de usuarios.
const sesiones = new Map();

function leerCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';').map(p => p.trim()).filter(Boolean).map(p => {
      const i = p.indexOf('=');
      return [decodeURIComponent(p.slice(0, i)), decodeURIComponent(p.slice(i + 1))];
    })
  );
}

function sesionValida(token) {
  if (!token || !sesiones.has(token)) return false;
  const expira = sesiones.get(token);
  if (Date.now() > expira) { sesiones.delete(token); return false; }
  return true;
}

app.use(express.json());

if (APP_USER && APP_PASS) {
  app.post('/api/login', (req, res) => {
    const { usuario, contrasena } = req.body || {};
    if (usuario === APP_USER && contrasena === APP_PASS) {
      const token = crypto.randomBytes(32).toString('hex');
      sesiones.set(token, Date.now() + SESION_MS);
      res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESION_MS / 1000)}`);
      return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
  });

  app.post('/api/logout', (req, res) => {
    const { [COOKIE_NAME]: token } = leerCookies(req);
    if (token) sesiones.delete(token);
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    res.json({ ok: true });
  });

  app.use((req, res, next) => {
    if (req.path === '/login.html' || req.path === '/api/login') return next();

    const { [COOKIE_NAME]: token } = leerCookies(req);
    if (sesionValida(token)) return next();

    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const redirect = encodeURIComponent(req.originalUrl || '/');
    return res.redirect(`/login.html?redirect=${redirect}`);
  });
}

app.use(express.static(path.join(__dirname, 'public')));

// ---- Utilidades de almacenamiento ----
function leerCotizaciones() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function escribirCotizaciones(lista) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(lista, null, 2), 'utf8');
}

// ---- API ----

// Listar todo el historial (más reciente primero)
app.get('/api/cotizaciones', (req, res) => {
  const lista = leerCotizaciones();
  res.json(lista);
});

// Guardar una cotización nueva
app.post('/api/cotizaciones', (req, res) => {
  const body = req.body || {};
  const registro = {
    id: crypto.randomUUID(),
    folio: body.folio || '—',
    cliente: body.cliente || 'Sin cliente',
    proyecto: body.proyecto || '',
    fecha: body.fecha || '',
    total: Number(body.total) || 0,
    revisada: !!body.revisada,
    datos: body.datos || {},
    creado: new Date().toISOString()
  };
  const lista = leerCotizaciones();
  lista.unshift(registro);
  escribirCotizaciones(lista);
  res.status(201).json(registro);
});

// Eliminar una cotización puntual
app.delete('/api/cotizaciones/:id', (req, res) => {
  const lista = leerCotizaciones().filter(r => r.id !== req.params.id);
  escribirCotizaciones(lista);
  res.status(204).end();
});

// Borrar todo el historial
app.delete('/api/cotizaciones', (req, res) => {
  escribirCotizaciones([]);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Cotizador LAS NY escuchando en el puerto ${PORT}`);
});
