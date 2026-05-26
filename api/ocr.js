export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OCR_SPACE_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const body = req.body;

    const fd = new FormData();
    fd.append("apikey", apiKey);
    fd.append("base64Image", body.base64Image || "");
    fd.append("language", body.language || "eng");
    fd.append("scale", body.scale || "true");
    fd.append("isOverlayRequired", "false");
    fd.append("OCREngine", body.OCREngine || "2");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: fd,
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Proxy error" });
  }
}
