import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

// GET /config - Get platform configuration
router.get('/', (req: Request, res: Response) => {
  return res.status(200).json({
    fee: 0.02,
  });
});

export default router;
