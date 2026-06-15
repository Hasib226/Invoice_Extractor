import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { InvoiceSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const EXTRACTION_PROMPT = `You are an invoice data extraction system.

Extract structured data from the attached invoice. Return ONLY valid JSON matching this schema:

{
  "vendor_name": string | null,
  "vendor_address": string | null,
  "invoice_number": string | null,
  "invoice_date": string | null,
  "due_date": string | null,
  "currency": string | null,
  "subtotal": number | null,
  "tax": number | null,
  "total": number | null,
  "line_items": [
    { "description": string, "quantity": number | null, "unit_price": number | null, "total": number | null }
  ],
  "notes": string | null
}

Rules:
- Output ONLY the JSON object. No markdown, no code fences, no explanation.
- Use null when a field cannot be determined.
- Numbers must be raw (1234.56 not "1,234.56").
- Dates in ISO YYYY-MM-DD.
- If no clear line items, return []`;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported type: ${file.type}. Use PDF, JPG, PNG, or WebP.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      { inlineData: { mimeType: file.type, data: base64 } },
    ]);

    const text = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw: text },
        { status: 502 }
      );
    }

    const validated = InvoiceSchema.safeParse(parsed);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Schema mismatch", issues: validated.error.issues, raw: parsed },
        { status: 200 }
      );
    }

    return NextResponse.json({ invoice: validated.data }, { status: 200 });
  } catch (err) {
    console.error("Extraction error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}