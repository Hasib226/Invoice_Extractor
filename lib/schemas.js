import { z } from "zod";

export const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unit_price: z.number().nullable(),
  total: z.number().nullable(),
});

export const InvoiceSchema = z.object({
  vendor_name: z.string().nullable(),
  vendor_address: z.string().nullable(),
  invoice_number: z.string().nullable(),
  invoice_date: z.string().nullable(),
  due_date: z.string().nullable(),
  currency: z.string().nullable(),
  subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  total: z.number().nullable(),
  line_items: z.array(LineItemSchema),
  notes: z.string().nullable(),
});