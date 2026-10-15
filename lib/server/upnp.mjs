// Modulo UPnP / IGD — discovery dispositivi e interrogazione Internet Gateway Device (SOAP).
// Consente di ottenere statistiche WAN (byte totali) e port mapping aperti sul router senza privilegi.
import http from 'node:http';

/**
 * Parser leggero per descrizioni XML UPnP (senza dipendenze pesanti).
 * Estrae info dispositivo e cerca i servizi WANIPConnection / WANPPPConnection.
 * @param {string} xml
 * @param {string} [baseUrl]
 */
export function parseUpnpXml(xml, baseUrl = '') {
  if (!xml || typeof xml !== 'string') return null;

  const getTag = (t) => {
    const m = xml.match(new RegExp(`<${t}[^>]*>([^<]+)</${t}>`, 'i'));
    return m ? m[1].trim() : null;
  };

  const friendlyName = getTag('friendlyName');
  const modelName = getTag('modelName');
  const manufacturer = getTag('manufacturer');
  const deviceType = getTag('deviceType');

  // Cerca servizi IGD per WAN (WANIPConnection o WANPPPConnection)
  let igdService = null;
  const serviceRegex = /<service>([\s\S]*?)<\/service>/gi;
  let match;
  while ((match = serviceRegex.exec(xml))) {
    const sBlock = match[1];
    const sType = (sBlock.match(/<serviceType>([^<]+)<\/serviceType>/i) || [])[1]?.trim();
    const cUrl = (sBlock.match(/<controlURL>([^<]+)<\/controlURL>/i) || [])[1]?.trim();

    if (sType && cUrl && /WANIPConnection|WANPPPConnection/i.test(sType)) {
      let resolvedControlUrl = cUrl;
      if (baseUrl) {
        try {
          resolvedControlUrl = new URL(cUrl, baseUrl).toString();
        } catch {}
      }
      igdService = { serviceType: sType, controlUrl: resolvedControlUrl };
      break;
    }
  }

  return {
    friendlyName,
    modelName,
    manufacturer,
    deviceType,
    isIgd: !!igdService || /InternetGatewayDevice/i.test(deviceType || ''),
    igdService,
  };
}

/**
 * Estrae un valore numerico o stringa da un tag SOAP.
 */
export function parseSoapTag(soapText, tagName) {
  if (!soapText || typeof soapText !== 'string') return null;
  const m = soapText.match(new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`, 'i'));
  return m ? m[1].trim() : null;
}

/**
 * Esegue una chiamata SOAP verso un URL di controllo UPnP.
 * @param {string} controlUrl
 * @param {string} serviceType
 * @param {string} action
 * @param {Record<string, string|number>} [params]
 * @param {number} [timeoutMs]
 * @returns {Promise<string|null>}
 */
export function soapAction(controlUrl, serviceType, action, params = {}, timeoutMs = 2000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(controlUrl);
      let bodyArgs = '';
      for (const [k, v] of Object.entries(params)) {
        bodyArgs += `<${k}>${v}</${k}>`;
      }

      const body = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${action} xmlns:u="${serviceType}">
      ${bodyArgs}
    </u:${action}>
  </s:Body>
</s:Envelope>`;

      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port || 80,
          path: u.pathname + u.search,
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset="utf-8"',
            'SOAPAction': `"${serviceType}#${action}"`,
            'Content-Length': Buffer.byteLength(body),
            'Connection': 'close',
          },
          timeout: timeoutMs,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => {
            data += c;
            if (data.length > 65536) req.destroy();
          });
          res.on('end', () => resolve(res.statusCode === 200 ? data : null));
        }
      );

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.write(body);
      req.end();
    } catch {
      resolve(null);
    }
  });
}

/**
 * Interroga l'Internet Gateway Device per ottenere statistiche WAN e port mapping.
 * @param {string} controlUrl
 * @param {string} serviceType
 * @returns {Promise<{ externalIp: string|null, bytesReceived: number|null, bytesSent: number|null, portMappings: Array }>}
 */
export async function queryGatewayStats(controlUrl, serviceType) {
  const result = {
    externalIp: null,
    bytesReceived: null,
    bytesSent: null,
    portMappings: [],
  };

  try {
    // 1. IP Esterno
    const ipRes = await soapAction(controlUrl, serviceType, 'GetExternalIPAddress');
    if (ipRes) result.externalIp = parseSoapTag(ipRes, 'NewExternalIPAddress');

    // 2. Byte Ricevuti
    const rxRes = await soapAction(controlUrl, serviceType, 'GetTotalBytesReceived');
    if (rxRes) {
      const v = parseInt(parseSoapTag(rxRes, 'NewTotalBytesReceived'), 10);
      if (Number.isFinite(v)) result.bytesReceived = v;
    }

    // 3. Byte Trasmessi
    const txRes = await soapAction(controlUrl, serviceType, 'GetTotalBytesSent');
    if (txRes) {
      const v = parseInt(parseSoapTag(txRes, 'NewTotalBytesSent'), 10);
      if (Number.isFinite(v)) result.bytesSent = v;
    }

    // 4. Port Mappings aperti (fino a 25 elementi o errore)
    for (let i = 0; i < 25; i++) {
      const pmRes = await soapAction(controlUrl, serviceType, 'GetGenericPortMappingEntry', {
        NewPortMappingIndex: i,
      });
      if (!pmRes) break;

      const extPort = parseInt(parseSoapTag(pmRes, 'NewExternalPort'), 10);
      const intPort = parseInt(parseSoapTag(pmRes, 'NewInternalPort'), 10);
      const client = parseSoapTag(pmRes, 'NewInternalClient');
      const proto = parseSoapTag(pmRes, 'NewProtocol');
      const desc = parseSoapTag(pmRes, 'NewPortMappingDescription');
      const enabled = parseSoapTag(pmRes, 'NewEnabled') === '1';

      if (client && extPort) {
        result.portMappings.push({
          externalPort: extPort,
          internalPort: intPort,
          internalClient: client,
          protocol: proto || 'TCP',
          description: desc || 'UPnP',
          enabled,
        });
      }
    }
  } catch {}

  return result;
}
