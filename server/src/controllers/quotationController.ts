import { Response, NextFunction } from 'express';
import { Quotation } from '../models/Quotation.js';
import { Project } from '../models/Project.js';
import { Client } from '../models/Client.js';
import { StudioSettings } from '../models/StudioSettings.js';
import { getNextSequence } from '../models/Counter.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import { generateQuotationHtml } from '../pdf/quotationPdf.js';
import {
  calculateQuotation,
  type QuotationCalculationInput,
  type RoomItemInput,
  type DesignFeeInput,
  type AdditionalChargeInput,
  type DiscountInput,
  type TaxConfigInput,
  type PaymentMilestoneInput,
} from '../services/calculations/index.js';
import type { CreateQuotationInput, UpdateQuotationInput } from '../validators/quotation.js';
import crypto from 'crypto';

function generateId(): string {
  return crypto.randomUUID();
}

async function generateQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`quotation_${year}`);
  return `TSS-${year}-${String(seq).padStart(4, '0')}`;
}

function buildCalcInput(body: any): QuotationCalculationInput {
  return {
    rooms: (body.rooms || []).map((room: any) => ({
      roomId: room.roomId,
      name: room.name,
      items: (room.items || []).map((item: any): RoomItemInput => ({
        itemId: item.itemId,
        quantity: item.quantity || 0,
        rate: item.rate || 0,
        dimensions: item.dimensions,
        calculationMethod: (['piece', 'set', 'nos'].includes(item.unit) || item.calculationMethod === 'manual')
          ? 'manual'
          : (item.calculationMethod || 'manual'),
        isOptional: item.isOptional || false,
        isIncluded: item.isIncluded !== false,
      })),
    })),
    designFees: (body.designFees || []).map((fee: any): DesignFeeInput => ({
      feeType: fee.feeType,
      amount: fee.amount || 0,
      isTaxable: fee.isTaxable !== false,
    })),
    additionalCharges: (body.additionalCharges || []).map((charge: any): AdditionalChargeInput => ({
      amount: charge.amount || 0,
      isTaxable: charge.isTaxable !== false,
    })),
    discount: {
      type: body.discountConfig?.type || 'none',
      value: body.discountConfig?.value || 0,
    },
    taxConfig: {
      enabled: body.taxConfig?.enabled !== false,
      type: body.taxConfig?.type || 'exclusive',
      rate: body.taxConfig?.rate ?? 18,
      isInterState: body.taxConfig?.isInterState || false,
    },
    paymentMilestones: (body.paymentMilestones || []).map((m: any): PaymentMilestoneInput => ({
      description: m.description,
      percentage: m.percentage,
    })),
    carpetAreaSqFt: body.carpetAreaSqFt,
  };
}

export const quotationController = {
  async calculate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const calcInput = buildCalcInput(req.body);
      const result = calculateQuotation(calcInput);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { projectId, status, search, page = 1, limit = 20 } = req.query as any;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (projectId) filter.projectId = projectId;
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { quotationNumber: { $regex: search, $options: 'i' } },
          { 'clientSnapshot.name': { $regex: search, $options: 'i' } },
          { 'projectSnapshot.projectName': { $regex: search, $options: 'i' } },
        ];
      }

      const [quotations, total] = await Promise.all([
        Quotation.find(filter)
          .select('quotationNumber projectId clientSnapshot.name projectSnapshot.projectName revisionNumber status issueDate validUntil calculationSnapshot.grandTotal createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Quotation.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: quotations,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quotation = await Quotation.findById(req.params.id).lean();
      if (!quotation) {
        throw createAppError(404, 'NOT_FOUND', 'Quotation not found');
      }
      res.json({ success: true, data: quotation });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateQuotationInput;

      // Get project and client
      const project = await Project.findById(data.projectId).lean();
      if (!project) throw createAppError(404, 'NOT_FOUND', 'Project not found');

      const client = await Client.findById(project.clientId).lean();
      if (!client) throw createAppError(404, 'NOT_FOUND', 'Client not found');

      // Get studio settings for defaults
      const settings = await StudioSettings.findOne().lean();

      // Generate quotation number
      const quotationNumber = await generateQuotationNumber();

      // Server-side recalculation
      const calcInput = buildCalcInput(data);
      const calcResult = calculateQuotation(calcInput);

      // Build rooms with calculated amounts
      const rooms = (data.rooms || []).map((room, ri) => {
        const calcRoom = calcResult.rooms[ri];
        return {
          roomId: room.roomId || generateId(),
          name: room.name,
          notes: room.notes,
          order: room.order ?? ri,
          items: (room.items || []).map((item, ii) => {
            const calcItem = calcRoom?.items[ii];
            return {
              ...item,
              itemId: item.itemId || generateId(),
              quantity: item.quantity !== undefined && item.quantity !== null && item.quantity > 0
                ? item.quantity
                : (calcItem?.calculatedQuantity ?? 1),
              amount: calcItem?.amount ?? 0,
              order: item.order ?? ii,
            };
          }),
          subtotal: calcRoom?.subtotal ?? 0,
        };
      });

      const quotation = await Quotation.create({
        quotationNumber,
        projectId: data.projectId,
        clientSnapshot: {
          name: client.name,
          phone: client.phone,
          email: client.email,
          billingAddress: client.billingAddress,
        },
        projectSnapshot: {
          projectName: project.projectName,
          propertyType: project.propertyType,
          siteAddress: project.siteAddress,
          carpetAreaSqFt: project.carpetAreaSqFt,
        },
        revisionNumber: 1,
        status: 'draft',
        rooms,
        designFees: calcResult.designFees.map((f, i) => ({
          description: data.designFees?.[i]?.description || f.feeType,
          feeType: f.feeType,
          amount: f.amount,
          calculatedAmount: f.calculatedAmount,
          isTaxable: f.isTaxable,
        })),
        additionalCharges: data.additionalCharges || [],
        discountConfig: {
          type: data.discountConfig?.type || 'none',
          value: data.discountConfig?.value || 0,
          calculatedAmount: calcResult.calculationSnapshot.discountAmount,
        },
        taxConfig: data.taxConfig || settings?.defaultTaxConfig || {
          enabled: true,
          type: 'exclusive',
          rate: 18,
          isInterState: false,
        },
        inclusions: data.inclusions?.length ? data.inclusions : (settings?.defaultInclusions || []),
        exclusions: data.exclusions?.length ? data.exclusions : (settings?.defaultExclusions || []),
        terms: data.terms?.length ? data.terms : (settings?.defaultTerms || []),
        paymentMilestones: calcResult.paymentMilestones.map((m, i) => ({
          description: m.description || data.paymentMilestones?.[i]?.description || '',
          percentage: m.percentage,
          amount: m.amount,
        })),
        calculationSnapshot: calcResult.calculationSnapshot,
        createdBy: req.user!._id,
        version: 1,
      });

      res.status(201).json({ success: true, data: quotation });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body as UpdateQuotationInput;
      const quotation = await Quotation.findById(req.params.id);

      if (!quotation) {
        throw createAppError(404, 'NOT_FOUND', 'Quotation not found');
      }

      if (quotation.status !== 'draft') {
        throw createAppError(400, 'VALIDATION_ERROR', 'Only draft quotations can be edited');
      }

      if (data.version !== quotation.version) {
        throw createAppError(409, 'CONFLICT', 'Quotation has been modified by another session. Please refresh.');
      }

      // Recalculate
      const calcInput = buildCalcInput(data);
      const calcResult = calculateQuotation(calcInput);

      // Update rooms with calculated amounts
      if (data.rooms) {
        quotation.rooms = data.rooms.map((room, ri) => {
          const calcRoom = calcResult.rooms[ri];
          return {
            roomId: room.roomId || generateId(),
            name: room.name,
            notes: room.notes,
            order: room.order ?? ri,
            items: (room.items || []).map((item, ii) => {
              const calcItem = calcRoom?.items[ii];
              return {
                ...item,
                itemId: item.itemId || generateId(),
                quantity: item.quantity !== undefined && item.quantity !== null && item.quantity > 0
                  ? item.quantity
                  : (calcItem?.calculatedQuantity ?? 1),
                amount: calcItem?.amount ?? 0,
                order: item.order ?? ii,
              };
            }),
            subtotal: calcRoom?.subtotal ?? 0,
          };
        }) as any;
      }

      if (data.designFees) {
        quotation.designFees = calcResult.designFees.map((f, i) => ({
          description: data.designFees![i]?.description || f.feeType,
          feeType: f.feeType,
          amount: f.amount,
          calculatedAmount: f.calculatedAmount,
          isTaxable: f.isTaxable,
        })) as any;
      }

      if (data.additionalCharges) quotation.additionalCharges = data.additionalCharges as any;
      if (data.discountConfig) {
        quotation.discountConfig = {
          type: data.discountConfig.type || 'none',
          value: data.discountConfig.value || 0,
          calculatedAmount: calcResult.calculationSnapshot.discountAmount,
        } as any;
      }
      if (data.taxConfig) quotation.taxConfig = data.taxConfig as any;
      if (data.inclusions) quotation.inclusions = data.inclusions;
      if (data.exclusions) quotation.exclusions = data.exclusions;
      if (data.terms) quotation.terms = data.terms;
      if (data.paymentMilestones) {
        quotation.paymentMilestones = calcResult.paymentMilestones.map((m, i) => ({
          description: m.description || data.paymentMilestones![i]?.description || '',
          percentage: m.percentage,
          amount: m.amount,
        })) as any;
      }

      quotation.calculationSnapshot = calcResult.calculationSnapshot as any;
      quotation.version += 1;

      await quotation.save();
      res.json({ success: true, data: quotation });
    } catch (error) {
      next(error);
    }
  },

  async issue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) throw createAppError(404, 'NOT_FOUND', 'Quotation not found');
      if (quotation.status !== 'draft') {
        throw createAppError(400, 'VALIDATION_ERROR', 'Only draft quotations can be issued');
      }

      // Refresh client/project snapshots
      const project = await Project.findById(quotation.projectId).lean();
      if (project) {
        const client = await Client.findById(project.clientId).lean();
        if (client) {
          quotation.clientSnapshot = {
            name: client.name,
            phone: client.phone,
            email: client.email,
            billingAddress: client.billingAddress,
          } as any;
        }
        quotation.projectSnapshot = {
          projectName: project.projectName,
          propertyType: project.propertyType,
          siteAddress: project.siteAddress,
          carpetAreaSqFt: project.carpetAreaSqFt,
        } as any;
      }

      // Final recalculation
      const calcInput = buildCalcInput(quotation.toObject());
      const calcResult = calculateQuotation(calcInput);
      quotation.calculationSnapshot = calcResult.calculationSnapshot as any;

      const settings = await StudioSettings.findOne().lean();
      const validityDays = settings?.defaultQuotationValidityDays || 30;

      quotation.status = 'issued';
      quotation.issueDate = new Date();
      quotation.issuedAt = new Date();
      quotation.validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
      quotation.version += 1;

      await quotation.save();
      res.json({ success: true, data: quotation });
    } catch (error) {
      next(error);
    }
  },

  async createRevision(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const original = await Quotation.findById(req.params.id).lean();
      if (!original) throw createAppError(404, 'NOT_FOUND', 'Quotation not found');
      if (original.status === 'draft') {
        throw createAppError(400, 'VALIDATION_ERROR', 'Cannot revise a draft. Edit it directly.');
      }

      const newQuotation = await Quotation.create({
        ...original,
        _id: undefined,
        revisionNumber: original.revisionNumber + 1,
        status: 'draft',
        issueDate: undefined,
        issuedAt: undefined,
        validUntil: undefined,
        previousRevisionId: original._id,
        version: 1,
        createdAt: undefined,
        updatedAt: undefined,
      });

      res.status(201).json({ success: true, data: newQuotation });
    } catch (error) {
      next(error);
    }
  },

  async approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) throw createAppError(404, 'NOT_FOUND', 'Quotation not found');
      if (quotation.status !== 'issued') {
        throw createAppError(400, 'VALIDATION_ERROR', 'Only issued quotations can be approved');
      }

      // Check expiry
      if (quotation.validUntil && quotation.validUntil < new Date()) {
        throw createAppError(400, 'VALIDATION_ERROR', 'Quotation has expired');
      }

      quotation.status = 'approved';
      quotation.version += 1;
      await quotation.save();
      res.json({ success: true, data: quotation });
    } catch (error) {
      next(error);
    }
  },

  async reject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) throw createAppError(404, 'NOT_FOUND', 'Quotation not found');
      if (quotation.status !== 'issued') {
        throw createAppError(400, 'VALIDATION_ERROR', 'Only issued quotations can be rejected');
      }

      quotation.status = 'rejected';
      quotation.version += 1;
      await quotation.save();
      res.json({ success: true, data: quotation });
    } catch (error) {
      next(error);
    }
  },

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) throw createAppError(404, 'NOT_FOUND', 'Quotation not found');
      if (['cancelled'].includes(quotation.status)) {
        throw createAppError(400, 'VALIDATION_ERROR', 'Quotation is already cancelled');
      }

      quotation.status = 'cancelled';
      quotation.version += 1;
      await quotation.save();
      res.json({ success: true, data: quotation });
    } catch (error) {
      next(error);
    }
  },

  async getPdf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) throw createAppError(404, 'NOT_FOUND', 'Quotation not found');

      const settings = await StudioSettings.findOne();
      const html = generateQuotationHtml(quotation, settings);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      next(error);
    }
  },
};
