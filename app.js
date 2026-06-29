const form = document.querySelector("#geminiForm");
const apiKeyInput = document.querySelector("#apiKey");
const modeInput = document.querySelector("#mode");
const modelInput = document.querySelector("#model");
const modelHint = document.querySelector("#modelHint");
const promptInput = document.querySelector("#prompt");
const imageInput = document.querySelector("#imageInput");
const previewWrap = document.querySelector("#previewWrap");
const preview = document.querySelector("#preview");
const clearImageBtn = document.querySelector("#clearImage");
const sendBtn = document.querySelector("#sendBtn");
const statusBox = document.querySelector("#status");
const textOutput = document.querySelector("#textOutput");
const rawOutput = document.querySelector("#rawOutput");
const copyBtn = document.querySelector("#copyBtn");
const generatedImageWrap = document.querySelector("#generatedImageWrap");
const generatedImage = document.querySelector("#generatedImage");
const downloadImage = document.querySelector("#downloadImage");

let selectedImage = null;

modeInput.addEventListener("change", () => {
  if (modeInput.value === "interactions") {
    modelInput.value = "gemini-3.1-flash-image";
    modelHint.textContent = "Modo imagen. Requiere un modelo de imagen habilitado en tu cuenta, por ejemplo gemini-3.1-flash-image.";
  } else {
    modelInput.value = "gemini-2.5-flash";
    modelHint.textContent = "Modo texto/vision. Puedes probar gemini-2.5-flash u otro modelo compatible.";
  }
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  selectedImage = file || null;

  if (!file) {
    hidePreview();
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  preview.src = objectUrl;
  previewWrap.classList.remove("hidden");
});

clearImageBtn.addEventListener("click", () => {
  imageInput.value = "";
  selectedImage = null;
  hidePreview();
});

copyBtn.addEventListener("click", async () => {
  const text = textOutput.textContent.trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  setStatus("Texto copiado al portapapeles.");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const apiKey = apiKeyInput.value.trim();
  const mode = modeInput.value;
  const model = modelInput.value.trim();
  const prompt = promptInput.value.trim();

  if (!apiKey || !model || !prompt) {
    setStatus("Completa API key, modelo y prompt.", true);
    return;
  }

  resetOutputs();
  setLoading(true);

  try {
    const result = mode === "interactions"
      ? await callInteractionsApi({ apiKey, model, prompt, file: selectedImage })
      : await callGenerateContentApi({ apiKey, model, prompt, file: selectedImage });

    showResult(result, mode);
    setStatus("Respuesta recibida correctamente.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Error desconocido.", true);
  } finally {
    setLoading(false);
  }
});

async function callGenerateContentApi({ apiKey, model, prompt, file }) {
  const parts = [{ text: prompt }];

  if (file) {
    const imageData = await fileToBase64(file);
    parts.push({
      inlineData: {
        mimeType: file.type || "image/jpeg",
        data: imageData,
      },
    });
  }

  const body = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  return postJson(url, body);
}

async function callInteractionsApi({ apiKey, model, prompt, file }) {
  const input = [{ type: "text", text: prompt }];

  if (file) {
    const imageData = await fileToBase64(file);
    input.push({
      type: "image",
      mime_type: file.type || "image/jpeg",
      data: imageData,
    });
  }

  const body = {
    model,
    input,
    response_format: {
      type: "image",
      mime_type: "image/png",
      image_size: "1K",
    },
  };

  const url = "https://generativelanguage.googleapis.com/v1beta/interactions";
  return postJson(url, body, { "x-goog-api-key": apiKey });
}

async function postJson(url, body, extraHeaders = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let json;

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`La API devolvio una respuesta no JSON: ${text.slice(0, 400)}`);
  }

  if (!response.ok) {
    const message = json?.error?.message || JSON.stringify(json, null, 2);
    throw new Error(`Error ${response.status}: ${message}`);
  }

  return json;
}

function showResult(json, mode) {
  rawOutput.textContent = JSON.stringify(json, null, 2);

  const text = extractText(json, mode);
  textOutput.textContent = text || "No encontre texto en la respuesta.";

  const image = extractImage(json);
  if (image?.data) {
    const mimeType = image.mimeType || image.mime_type || "image/png";
    const dataUrl = `data:${mimeType};base64,${image.data}`;
    generatedImage.src = dataUrl;
    downloadImage.href = dataUrl;
    generatedImageWrap.classList.remove("hidden");
  }
}

function extractText(json, mode) {
  if (typeof json?.output_text === "string") return json.output_text;
  if (typeof json?.text === "string") return json.text;

  if (mode === "generateContent") {
    const parts = json?.candidates?.[0]?.content?.parts || [];
    return parts.map((part) => part.text).filter(Boolean).join("\n\n");
  }

  const chunks = [];
  collectStrings(json, chunks, ["text", "output_text"]);
  return [...new Set(chunks)].join("\n\n");
}

function extractImage(json) {
  if (json?.output_image?.data) return json.output_image;
  if (json?.outputImage?.data) return json.outputImage;

  const queue = [json];
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== "object") continue;

    if (typeof value.data === "string" && (value.mime_type || value.mimeType)) {
      const mime = value.mime_type || value.mimeType;
      if (String(mime).startsWith("image/")) return value;
    }

    for (const child of Object.values(value)) {
      if (child && typeof child === "object") queue.push(child);
    }
  }

  return null;
}

function collectStrings(value, output, keys) {
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    if (keys.includes(key) && typeof child === "string") output.push(child);
    if (child && typeof child === "object") collectStrings(child, output, keys);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function hidePreview() {
  preview.src = "";
  previewWrap.classList.add("hidden");
}

function resetOutputs() {
  textOutput.textContent = "";
  rawOutput.textContent = "";
  generatedImage.src = "";
  downloadImage.href = "";
  generatedImageWrap.classList.add("hidden");
}

function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  sendBtn.textContent = isLoading ? "Enviando..." : "Enviar a Gemini";
}

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.style.color = isError ? "#a40000" : "#636b74";
  statusBox.style.borderColor = isError ? "#ffb3b3" : "#ddd7ce";
  statusBox.style.background = isError ? "#fff1f1" : "#fbfaf8";
}
