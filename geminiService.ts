
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

export interface WallSegment {
  id: string;
  pathData: string;
  label: string;
}

export interface AIResponse {
  editedImage?: string;
  segments?: WallSegment[];
  description: string;
}

/**
 * Modes:
 * - edit: fotorealistische Vorschau
 * - segment: SVG Konturen
 * - keymask: PNG Overlay, Wandpixel exakt #FFD500, Rest transparent
 */
export const processRoomRequest = async (
  base64Image: string,
  prompt: string,
  mode: "segment" | "edit" | "keymask"
): Promise<AIResponse | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    if (mode === "keymask") {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
            {
              text:
                [
                  "Erstelle ein PNG-Overlay als exakte Key-Mask fuer Waende/Decke.",
                  "REGELN (sehr wichtig):",
                  "1) Alle Wand- und Deckenpixel MUESSEN exakt die Farbe #FFD500 haben (RGB 255,213,0).",
                  "2) Alles andere MUSS voll transparent sein (Alpha 0).",
                  "3) Keine Schattierung, keine Verlaeufe, kein Anti-Aliasing, keine Mischfarben an Kanten.",
                  "4) Keine Aenderung am Bildstil, nur eine Masken-Overlay-Grafik erzeugen.",
                  "5) Ausgabe MUSS PNG sein."
                ].join("\n")
            }
          ]
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          return {
            editedImage: `data:image/png;base64,${part.inlineData.data}`,
            description: "Key-Mask Overlay generiert (#FFD500, transparent background)"
          };
        }
      }
      return null;
    }

    if (mode === "edit") {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
            {
              text: `Bearbeite dieses Foto: ${prompt}. Ändere NUR die Wandfarben. Halte Möbel, Pflanzen und Details wie Lampenkabel absolut scharf und unverändert. Das Ergebnis muss fotorealistisch sein.`
            }
          ]
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          return { editedImage: `data:image/png;base64,${part.inlineData.data}`, description: "Bild generiert" };
        }
      }
      return null;
    }

    // mode === 'segment'
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
          { text: "Identifiziere alle Wandflächen. Erzeuge fuer jede Fläche eine geschlossene Kontur (SVG Path, 0-1000 Scale). Antworte in JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  pathData: { type: Type.STRING, description: "Closed SVG path (M, L, Z)" },
                  label: { type: Type.STRING }
                },
                required: ["id", "pathData", "label"]
              }
            }
          },
          required: ["segments"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (err) {
    console.error("AI Action failed:", err);
    return null;
  }
};

/**
 * Extracts invoice data from a document (image/pdf)
 */
export const analyzeSupplierInvoice = async (base64Data: string, mimeType: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using 1.5 Flash for cost/speed efficiency on document analysis
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { 
            text: `Extrahiere Daten aus dieser Lieferantenrechnung. Antworte strikt in JSON.
            Felder:
            - docNumber (Rechnungsnummer)
            - date (Rechnungsdatum YYYY-MM-DD)
            - dueDate (Fälligkeitsdatum YYYY-MM-DD)
            - totalGross (Bruttobetrag Zahl)
            - totalTax (Steuerbetrag Zahl)
            - currency (Währung z.B. CHF)
            - supplierName (Name des Lieferanten)
            - items (Liste von Positionen: description, quantity, unit, price (Einzelpreis), taxRate (Steuersatz))` 
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (err) {
    console.error("Invoice Analysis failed:", err);
    return null;
  }
};

/**
 * getGeminiResponse: Handles general chat and tool calling for the AIChat component.
 */
export const getGeminiResponse = async (message: string, history: any[]): Promise<GenerateContentResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const createQuoteDraftDeclaration = {
    name: 'createQuoteDraft',
    parameters: {
      type: Type.OBJECT,
      description: 'Erstellt einen Entwurf für eine Offerte basierend auf den Kundenangaben.',
      properties: {
        clientName: { type: Type.STRING, description: 'Vollständiger Name des Kunden' },
        clientAddress: { type: Type.STRING, description: 'Adresse des Kunden' },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING, description: 'Beschreibung der Arbeit' },
              quantity: { type: Type.NUMBER, description: 'Menge' },
              unit: { type: Type.STRING, description: 'Einheit (m2, Std, Paush, etc.)' },
              pricePerUnit: { type: Type.NUMBER, description: 'Preis pro Einheit in CHF' }
            },
            required: ['description', 'quantity', 'unit', 'pricePerUnit']
          }
        }
      },
      required: ['clientName', 'items']
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [...history, { role: 'user', parts: [{ text: message }] }],
    config: {
      systemInstruction: 'Du bist der digitale Assistent von Maler Borer. Sei freundlich, professionell und hilfsbereit. Deine Aufgabe ist es, Kundenanfragen zu beantworten und bei Bedarf Offerten-Entwürfe zu erstellen. Wenn ein Kunde Arbeiten beschreibt, biete an einen Entwurf zu erstellen oder nutze das Tool createQuoteDraft direkt, wenn genügend Informationen vorhanden sind.',
      tools: [{ functionDeclarations: [createQuoteDraftDeclaration] }]
    }
  });

  return response;
};
