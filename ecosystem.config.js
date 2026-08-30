// Configuración para pm2. Edita APP_USER / APP_PASS aquí antes de arrancar
// (no dependas de "export" en la terminal, aquí no se te va a olvidar).
module.exports = {
  apps: [
    {
      name: 'cotizador-lasny',
      script: 'server.js',
      env: {
        PORT: 3000,
        APP_USER: 'CAMBIA_ESTE_USUARIO',
        APP_PASS: 'CAMBIA_ESTA_CONTRASENA'
      }
    }
  ]
};
