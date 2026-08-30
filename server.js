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

// ---- Autenticación básica opcional ----
// Si defines APP_USER y APP_PASS (como variables de entorno o en un archivo .env
// cargado antes de arrancar), el sitio pide usuario/contraseña antes de dejar entrar.
// Si no las defines, el sitio queda abierto a quien tenga la URL.
const APP_USER = process.env.APP_USER;
const APP_PASS = process.env.APP_PASS;

if (APP_USER && APP_PASS) {
  app.use((req, res, next) => {
    const header = req.headers.authorization || '';
    const [tipo, credenciales] = header.split(' ');
    if (tipo === 'Basic' && credenciales) {
      const [user, pass] = Buffer.from(credenciales, 'base64').toString().split(':');
      if (user === APP_USER && pass === APP_PASS) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Cotizador LAS NY"');
    res.status(401).send('Acceso restringido.');
  });
}

app.use(express.json());
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
