module.exports = {
  apps: [
    {
      name: 'violet-monarchs',
      script: 'src/server.js',
      autorestart: true,
      max_restarts: 20,
    },
    {
      name: 'cloudflared',
      script: 'cloudflared',
      args: 'tunnel --url http://localhost:3000',
      // Deliberately NOT auto-restarted: a Quick Tunnel gets a new random
      // trycloudflare.com URL every time this process (re)starts, which
      // would break every QR code / link already handed out to guests.
      // If it dies during the event, a human needs to notice, restart it
      // manually, and re-share the new URL. See docs/spec.md hosting notes.
      autorestart: false,
    },
  ],
};
