import { Device, Port } from '../types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

interface DeviceIdentification {
  device_model?: string;
  device_brand?: string;
  device_category?: string;
  confidence: number;
  reasoning: string;
}

export async function identifyDeviceWithGemini(device: Device): Promise<DeviceIdentification | null> {
  if (!GEMINI_API_KEY) {
    console.warn('[Gemini] API key not configured');
    return null;
  }

  try {
    // Costruisci il prompt con le informazioni del device
    const openPorts = device.ports?.filter(p => p.state === 'open') || [];
    const portInfo = openPorts.map(p => 
      `Port ${p.port_number}/${p.protocol}: ${p.service_name || 'unknown'}${p.service_version ? ` (${p.service_version})` : ''}`
    ).join('\n');

    const prompt = `Analyze this network device and identify its exact model, brand, and category.

Device Information:
- IP Address: ${device.ip_address}
- Hostname: ${device.hostname || 'Unknown'}
- MAC Address: ${device.mac_address || 'Unknown'}
- Manufacturer (from MAC): ${device.manufacturer || 'Unknown'}
- OS Detection: ${device.os_detection || 'Unknown'}

Open Ports and Services:
${portInfo || 'No open ports detected'}

Based on this information, provide:
1. Device Model (e.g., "iPhone 15 Pro", "Raspberry Pi 4 Model B", "Samsung Smart TV UN55", "ThinkPad X1 Carbon Gen 11")
2. Brand (e.g., "Apple", "Raspberry Pi Foundation", "Samsung", "Lenovo")
3. Category (e.g., "smartphone", "single-board-computer", "smart-tv", "laptop", "desktop", "router", "iot-device", "printer", "nas", "server")
4. Confidence level (0.0 to 1.0)
5. Brief reasoning

Respond ONLY with valid JSON in this exact format:
{
  "device_model": "exact model name",
  "device_brand": "brand name",
  "device_category": "category",
  "confidence": 0.85,
  "reasoning": "brief explanation"
}

If you cannot identify the device with confidence, use generic values and lower confidence.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('No content in Gemini response');
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonText = textContent.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const identification: DeviceIdentification = JSON.parse(jsonText);
    
    console.log(`[Gemini] Identified ${device.ip_address}: ${identification.device_model} (${identification.confidence})`);
    
    return identification;
  } catch (error) {
    console.error('[Gemini] Error identifying device:', error);
    return null;
  }
}

export async function batchIdentifyDevices(devices: Device[]): Promise<Map<string, DeviceIdentification>> {
  const results = new Map<string, DeviceIdentification>();
  
  // Process in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < devices.length; i += batchSize) {
    const batch = devices.slice(i, i + batchSize);
    const promises = batch.map(async (device) => {
      const id = await identifyDeviceWithGemini(device);
      if (id) {
        results.set(device.id, id);
      }
    });
    
    await Promise.all(promises);
    
    // Rate limiting delay
    if (i + batchSize < devices.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
