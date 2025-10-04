import express, { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Invoice } from '../models/Invoice';

const router: Router = express.Router();

// Validation schema for invoice creation
const createInvoiceSchema = z.object({
  id: z.string().min(1, 'Invoice ID is required'),
  amount: z.number().positive('Amount must be positive'),
  status: z.enum(['pending', 'financed', 'repaid', 'defaulted']).optional(),
  tokenId: z.number().optional(),
  recipient: z.string().optional(),
  dueDate: z.string().or(z.date()).optional(),
  debtorId: z.string().optional(),
});

// POST /invoice/create - Create invoice record
router.post('/create', async (req: Request, res: Response) => {
  try {
    const validationResult = createInvoiceSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const { id, amount, status, tokenId, recipient, dueDate, debtorId } = validationResult.data;

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ id });
    if (existingInvoice) {
      return res.status(400).json({
        error: 'Invoice already exists',
        invoice: existingInvoice,
      });
    }

    // Create new invoice
    const invoice = await Invoice.create({
      id,
      amount,
      status: status || 'pending',
      tokenId,
      recipient,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      debtorId,
    });

    return res.status(201).json({
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create invoice',
    });
  }
});

// GET /invoice/list - Get all invoices
router.get('/list', async (req: Request, res: Response) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    return res.status(200).json({
      invoices,
      count: invoices.length,
    });
  } catch (error) {
    console.error('List invoices error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch invoices',
    });
  }
});

// GET /invoice/:id - Get single invoice
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findOne({ id });

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
      });
    }

    return res.status(200).json({ invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch invoice',
    });
  }
});

// PATCH /invoice/:id - Update invoice status
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'financed', 'repaid', 'defaulted'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: pending, financed, repaid, defaulted',
      });
    }

    const invoice = await Invoice.findOneAndUpdate(
      { id },
      { status },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
      });
    }

    return res.status(200).json({
      message: 'Invoice updated successfully',
      invoice,
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update invoice',
    });
  }
});

// POST /invoice/sync-status - Sync status from blockchain
router.post('/sync-status/:tokenId', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const { status } = req.body;

    if (!['pending', 'financed', 'repaid', 'defaulted'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: pending, financed, repaid, defaulted',
      });
    }

    // Find invoice by tokenId and update status
    const invoice = await Invoice.findOneAndUpdate(
      { tokenId: parseInt(tokenId) },
      { status },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found with this tokenId',
      });
    }

    return res.status(200).json({
      message: 'Invoice status synced from blockchain',
      invoice,
    });
  } catch (error) {
    console.error('Sync invoice status error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to sync invoice status',
    });
  }
});

export default router;
