function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.message === 'Invalid token') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.message === 'Unauthorized') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

module.exports = errorHandler;
