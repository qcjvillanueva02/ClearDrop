const cron = require('node-cron');

/**
 * Schedule a self-ping every 14 minutes to prevent Render free-tier spin-down.
 * @param {number} port - The port the server is listening on
 */
function startKeepAlive(port) {
  const url = process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
    : `http://localhost:${port}/api/health`;

  // Every 14 minutes: "*/14 * * * *"
  cron.schedule('*/14 * * * *', async () => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log(`[keep-alive] Ping OK at ${data.timestamp}`);
    } catch (err) {
      console.error('[keep-alive] Ping failed:', err.message);
    }
  });

  console.log(`[keep-alive] Cron scheduled — pinging ${url} every 14 minutes`);
}

module.exports = { startKeepAlive };
