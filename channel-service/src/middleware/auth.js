// Simple shared-secret authentication between the CRM backend and the channel service
export const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expected = process.env.CHANNEL_SERVICE_API_KEY || 'shared_secret_between_services';

  if (!apiKey || apiKey !== expected) {
    return res.status(401).json({ success: false, message: 'Invalid or missing x-api-key header' });
  }

  next();
};
