import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User';

const router: Router = express.Router();

// Validation schema for KYC request
const kycRequestSchema = z.object({
  wallet: z.string().min(1, 'Wallet address is required'),
});

// POST /kyc/request - Request KYC verification
router.post('/request', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = kycRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const { wallet } = validationResult.data;

    // Check if user already exists
    let user = await User.findOne({ wallet: wallet.toLowerCase() });

    if (user) {
      // Update existing user's KYC status to approved
      user.kycStatus = 'approved';
      await user.save();
    } else {
      // Create new user with approved KYC status
      user = await User.create({
        wallet: wallet.toLowerCase(),
        kycStatus: 'approved',
      });
    }

    return res.status(200).json({
      wallet: user.wallet,
      kycStatus: user.kycStatus,
    });
  } catch (error) {
    console.error('KYC request error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process KYC request',
    });
  }
});

export default router;
