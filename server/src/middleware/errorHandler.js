export function errorHandler(err, req, res, _next) {
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message || err);

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE'))) {
    return res.status(409).json({ error: 'A record with this value already exists.' });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.expose ? err.message : (status < 500 ? err.message : 'Internal server error');

  res.status(status).json({ error: message });
}

export function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  return err;
}
