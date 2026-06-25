import Anthropic from "@anthropic-ai/sdk";
import type { ParsedReceipt } from "./types";

const client = new Anthropic();

export async function parseReceiptImage(imageBase64: string, mediaType: string): Promise<ParsedReceipt> {
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: imageBase64 },
          },
          {
            type: "text",
            text: `Extract all information from this grocery/store receipt and return ONLY valid JSON matching this exact schema. Today is ${new Date().toISOString().split("T")[0]} for reference.

{
  "store_name": "string (store/merchant name)",
  "store_address": "string or null",
  "date": "YYYY-MM-DD format",
  "subtotal": number or null,
  "tax": number or null,
  "total": number,
  "items": [
    {
      "name": "string (clean product name, no codes)",
      "quantity": number (default 1),
      "unit_price": number or null,
      "total_price": number,
      "category": "one of: produce, dairy, meat, bakery, frozen, beverages, snacks, household, personal_care, pharmacy, deli, seafood, canned_goods, condiments, grains, alcohol, other"
    }
  ]
}

Rules:
- All prices must be positive numbers
- Infer categories from item names
- If date is unclear, use today's date
- Do not include tax lines, discounts, or totals as items
- Return ONLY the JSON object, no markdown or explanation`,
          },
        ],
      },
    ],
  });

  const text = (response.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Claude response");
  return JSON.parse(jsonMatch[0]) as ParsedReceipt;
}
