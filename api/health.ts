export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).json({
    status: 'ok',
    environment: 'vercel-serverless',
    timestamp: Date.now()
  });
}
