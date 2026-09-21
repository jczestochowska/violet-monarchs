module.exports = {
  apps: [
    {
      name: 'violet-monarchs',
      script: 'src/server.js',
      autorestart: true,
      max_restarts: 20,
    },
  ],
};
