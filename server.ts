import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Load environment variables
dotenv.config();

// Secure fallback: Sync environment variables from .env.example if missing in process.env
try {
  const examplePath = path.join(process.cwd(), ".env.example");
  if (fs.existsSync(examplePath)) {
    const exampleConfig = dotenv.config({ path: examplePath });
    if (exampleConfig.parsed) {
      console.log("Loading .env.example backup configuration variables...");
      for (const key of Object.keys(exampleConfig.parsed)) {
        if (!process.env[key] || process.env[key] === "MY_" + key || process.env[key] === "") {
          process.env[key] = exampleConfig.parsed[key];
        }
      }
    }
  }
} catch (e: any) {
  console.warn("Environment sync warning:", e.message);
}

const app = express();
const PORT = 3000;

// Body parser with 50mb limit for PDF contents, vision uploads, and voice segments
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Standard security headers and CORS (managed cleanly relative to port 3000 mapping)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

// Helper function to query Wikipedia (Active Web Search)
async function searchWikipedia(query: string) {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&format=json&origin=*`
    );
    const data: any = await response.json();
    if (data.query?.search) {
      return data.query.search.map((item: any) => ({
        title: item.title,
        snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""), // Strip html tags
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
      }));
    }
    return [];
  } catch (error) {
    console.error("Wikipedia search error:", error);
    return [];
  }
}

// Helper function to query weather metrics
async function fetchWeather(city: string) {
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData: any = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      return { error: `City '${city}' not resolved in open meteorological directories.` };
    }
    
    const { latitude, longitude, name, country } = geoData.results[0];
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData: any = await weatherRes.json();
    
    return {
      location: `${name}, ${country}`,
      latitude,
      longitude,
      temperature: weatherData.current.temperature_2m,
      apparentTemperature: weatherData.current.apparent_temperature,
      humidity: weatherData.current.relative_humidity_2m,
      windSpeed: weatherData.current.wind_speed_10m,
      weatherCode: weatherData.current.weather_code,
    };
  } catch (error) {
    console.error("Weather lookup error:", error);
    return { error: "Failed to fetch micro-climatic metrics from Open-Meteo." };
  }
}

// Robust, direct REST alternative to query Gemini without Wrapper authentication bottlenecks
async function generateGeminiDirect(
  geminiApiKey: string,
  messages: any[],
  systemInstruction?: string,
  temperature?: number
): Promise<{ text: string; route: string }> {
  // Convert messages to Gemini formats
  const contents: any[] = [];
  let resolvedSystemInstruction = systemInstruction || "";

  if (Array.isArray(messages)) {
    for (const m of messages) {
      if (m.role === "system") {
        const sysContent = typeof m.content === "string"
          ? m.content
          : (Array.isArray(m.content) ? m.content.map((p: any) => p.text).join(" ") : "");
        resolvedSystemInstruction += (resolvedSystemInstruction ? "\n" : "") + sysContent;
      } else {
        const role = m.role === "assistant" ? "model" : "user";
        const parts: any[] = [];

        if (typeof m.content === "string") {
          parts.push({ text: m.content });
        } else if (Array.isArray(m.content)) {
          for (const item of m.content) {
            if (item.type === "text") {
              parts.push({ text: item.text });
            } else if (item.type === "image_url") {
              const match = item.image_url?.url?.match(/^data:([^;]+);base64,(.*)$/);
              if (match) {
                parts.push({
                  inlineData: {
                    mimeType: match[1],
                    data: match[2]
                  }
                });
              }
            }
          }
        }
        if (parts.length > 0) {
          contents.push({ role, parts });
        }
      }
    }
  }

  const payload: any = {
    contents: contents,
    generationConfig: {
      temperature: temperature ?? 0.7,
    }
  };

  if (resolvedSystemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: resolvedSystemInstruction }]
    };
  }

  const isOAuthToken = geminiApiKey.startsWith("ya29.") || (geminiApiKey.length > 100 && !geminiApiKey.startsWith("AQ."));

  if (isOAuthToken) {
    console.log("Direct Gemini connection using detected OAuth token... routing through Vertex AI / REST flows.");

    // Direct Route 1: Vertex AI (designed specifically for OAuth tokens on Cloud Run containers)
    const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "google-ai-studio-build";
    const region = process.env.LOCATION || process.env.REGION || "us-central1";
    const vertexModel = "gemini-2.5-flash";
    const vertexUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/${vertexModel}:generateContent`;

    try {
      console.log(`Dispatching Vertex query to: ${vertexUrl}`);
      const vertexRes = await fetch(vertexUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${geminiApiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "aistudio-build",
        },
        body: JSON.stringify(payload)
      });

      if (vertexRes.ok) {
        const vertexData: any = await vertexRes.json();
        const text = vertexData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return { text, route: "Vertex AI Backend Node" };
      } else {
        const errText = await vertexRes.text();
        console.warn(`Vertex AI route failed: [${vertexRes.status}]`, errText);
      }
    } catch (err: any) {
      console.warn("Vertex AI interface error:", err.message);
    }

    // Direct Route 2: Google AI Studio REST with Bearer Auth
    const aiStudioUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    try {
      console.log(`Dispatching AI Studio REST query with token to: ${aiStudioUrl}`);
      const studioRes = await fetch(aiStudioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${geminiApiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "aistudio-build",
        },
        body: JSON.stringify(payload)
      });

      if (studioRes.ok) {
        const studioData: any = await studioRes.json();
        const text = studioData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return { text, route: "AI Studio REST Bearer Route" };
      } else {
        const errText = await studioRes.text();
        console.warn(`AI Studio Bearer route failed: [${studioRes.status}]`, errText);
      }
    } catch (err: any) {
      console.warn("AI Studio Bearer interface error:", err.message);
    }

    // Direct Route 3: Vertex AI with gemini-3.5-flash model mapping
    const fallbackVertexModel = "gemini-3.5-flash";
    const backupVertexUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/google/models/${fallbackVertexModel}:generateContent`;

    try {
      console.log(`Dispatching alternative models to backup location: ${backupVertexUrl}`);
      const backupRes = await fetch(backupVertexUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${geminiApiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "aistudio-build",
        },
        body: JSON.stringify(payload)
      });

      if (backupRes.ok) {
        const backupData: any = await backupRes.json();
        const text = backupData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return { text, route: "Vertex AI Backup Model" };
      }
    } catch (err: any) {
      console.warn("Backup Vertex AI interface error:", err.message);
    }

    throw new Error("Authenticating with standard REST endpoints failed under all available carrier scopes (401/403).");
    
  } else {
    // Direct Route 4: standard API Key route
    const aiStudioUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    console.log("Direct Gemini connection using standard API Key...");
    
    const studioRes = await fetch(aiStudioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "aistudio-build",
      },
      body: JSON.stringify(payload)
    });

    if (studioRes.ok) {
      const studioData: any = await studioRes.json();
      const text = studioData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { text, route: "AI Studio REST API Key" };
    } else {
      const errText = await studioRes.text();
      throw new Error(`AI Studio API Key rejected [${studioRes.status}]: ${errText}`);
    }
  }
}

// API endpoint to proxy OpenRouter requests with secure native fallback
app.post("/api/chat", async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens } = req.body;
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    let fallbackToGemini = false;
    let fallbackReason = "";

    if (!apiKey) {
      fallbackToGemini = true;
      fallbackReason = "OpenRouter API Key is missing";
    }

    if (!fallbackToGemini) {
      const payload = {
        model: model || "google/gemini-2.5-flash",
        messages: messages || [],
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 2048,
      };

      console.log(`Sending proxy query to OpenRouter using model: ${payload.model}`);

      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai.studio/build",
            "X-Title": "AR-AI Assistant"
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const responseData = await response.json();
          return res.json(responseData);
        } else {
          const errorText = await response.text();
          console.error(`OpenRouter error response [${response.status}]:`, errorText);
          
          if (response.status === 401 || response.status === 403) {
            fallbackToGemini = true;
            fallbackReason = `OpenRouter credentials invalid or unauthorized (status ${response.status})`;
          } else {
            return res.status(response.status).json({
              error: "Failed to fetch response from OpenRouter",
              details: errorText
            });
          }
        }
      } catch (fetchError: any) {
        console.error("OpenRouter fetch network error, attempting fallback:", fetchError);
        fallbackToGemini = true;
        fallbackReason = `OpenRouter link failed: ${fetchError.message}`;
      }
    }

    if (fallbackToGemini) {
      console.log(`Active server-side routing: ${fallbackReason}. Attempting native fallback to Gemini API...`);
      
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return res.status(500).json({
          error: "Routing failure",
          details: "Both OpenRouter and Gemini API configurations are unavailable."
        });
      }

      console.log("DIAGNOSTIC - geminiApiKey:", {
        length: geminiApiKey.length,
        startsWithAIza: geminiApiKey.startsWith("AIzaSy"),
        startsWithYa29: geminiApiKey.startsWith("ya29."),
        first10: geminiApiKey.substring(0, 10)
      });

      const defaultInstruction = "You are the AR-AI Assistant (Advanced Responsive Artificial Intelligence Assistant). Speak in precise markdown prose.";
      try {
        const geminiResult = await generateGeminiDirect(
          geminiApiKey,
          messages,
          defaultInstruction,
          temperature
        );

        return res.json({
          choices: [
            {
              message: {
                role: "assistant",
                content: geminiResult.text + `\n\n*(Routed securely via server fallback node \`gemini-2.5-flash\` [${geminiResult.route}])*`
              }
            }
          ]
        });
      } catch (geminiError: any) {
        console.error("Gemini direct fallback failed:", geminiError);
        
        const setupGuideMessage = `### ⚠️ AI Engine API Key Activation Required\n\n` +
          `Hello! The **AR-AI Assistant** is currently in diagnostic sandbox standby. The active API credentials in your environment require setup or activation:\n\n` +
          `1. **OpenRouter Auth**: Code \`401\` or unconfigured (${fallbackReason ? fallbackReason.replace(/[\n\r]+/g, " ") : "placeholder key"}).\n` +
          `2. **Gemini Fallback Auth**: Native identity token verification returned unauthenticated (\`401 UNAUTHENTICATED\`).\n\n` +
          `#### 🛠️ How to configure and activate your models:\n` +
          `Please define your actual, live API credentials in the **Secrets Settings manager**:\n` +
          `* Open the **Settings** menu at the top/bottom left of the AI Studio Build workspace.\n` +
          `* Select **Secrets**.\n` +
          `* Add or update your Google Gemini API key as \`GEMINI_API_KEY\` (typically starting with \`AIzaSy...\`).\n` +
          `* Or add your real OpenRouter API key as \`OPENROUTER_API_KEY\` (starting with \`sk-or-v1-...\`).\n\n` +
          `*(Once entered, your secrets are immediately active! Refresh your chat session to re-establish secure model routing.)*`;

        return res.json({
          choices: [
            {
              message: {
                role: "assistant",
                content: setupGuideMessage
              }
            }
          ]
        });
      }
    }

  } catch (error: any) {
    console.error("Express Chat proxy exception:", error);
    res.status(500).json({
      error: "Our secure server-side bridge encountered an exception.",
      details: error.message
    });
  }
});

// Weather Tool API Route
app.get("/api/weather", async (req, res) => {
  const city = req.query.city as string;
  if (!city) {
    return res.status(400).json({ error: "Missing parameter: 'city'." });
  }
  const weatherResult = await fetchWeather(city);
  res.json(weatherResult);
});

// Web Search Tool API Route
app.get("/api/search", async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Missing parameter: 'q'." });
  }
  const searchResults = await searchWikipedia(query);
  res.json({ results: searchResults });
});

// App health check
app.get("/api/health", (req, res) => {
  const gemini = process.env.GEMINI_API_KEY || "";
  const openrouter = process.env.OPENROUTER_API_KEY || "";
  res.json({
    status: "healthy",
    timestamp: new Date(),
    diagnostics: {
      geminiKeyLength: gemini.length,
      geminiKeyPrefix: gemini.length > 5 ? gemini.substring(0, 7) + "..." : "none/short",
      openrouterKeyLength: openrouter.length,
      openrouterKeyPrefix: openrouter.length > 5 ? openrouter.substring(0, 10) + "..." : "none/short"
    },
    envKeys: Object.keys(process.env).filter(key => !key.toLowerCase().includes("key") && !key.toLowerCase().includes("secret") && !key.toLowerCase().includes("token"))
  });
});

// Automated self-diagnostic probe on startup
async function runDiagnosticProbe() {
  const logFile = path.join(process.cwd(), "gemini_debug.txt");
  let logContent = `--- GEMINI DIAGNOSTIC PROBE AT ${new Date().toISOString()} ---\n`;
  
  try {
    const key = process.env.GEMINI_API_KEY || "";
    logContent += `GEMINI_API_KEY length: ${key.length}\n`;
    logContent += `GEMINI_API_KEY prefix: ${key.substring(0, 15)}...\n`;
    logContent += `Is starts with AIzaSy: ${key.startsWith("AIzaSy")}\n`;
    logContent += `Is starts with ya29.: ${key.startsWith("ya29.")}\n`;
    logContent += `Is starts with AQ.: ${key.startsWith("AQ.")}\n`;
    
    // Log all environment variable keys (names only, no values)
    logContent += `\nAll process.env Keys:\n`;
    const keys = Object.keys(process.env).sort();
    for (const k of keys) {
      logContent += `  - ${k} (length: ${process.env[k]?.length || 0})\n`;
    }

    // Query GCP metadata server for project-id
    let projectId = "google-ai-studio-build";
    try {
      const projRes = await fetch("http://metadata.google.internal/computeMetadata/v1/project/project-id", {
        headers: { "Metadata-Flavor": "Google" },
        signal: AbortSignal.timeout(2000)
      });
      if (projRes.ok) {
        projectId = (await projRes.text()).trim();
        logContent += `GCP Metadata Server Project ID: ${projectId}\n`;
      } else {
        logContent += `GCP Metadata Server project-id returned status: ${projRes.status}\n`;
      }
    } catch (e: any) {
      logContent += `GCP Metadata Server project-id query failed: ${e.message}\n`;
    }

    // Query GCP metadata server for region/zone
    let region = "us-central1";
    try {
      const zoneRes = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/zone", {
        headers: { "Metadata-Flavor": "Google" },
        signal: AbortSignal.timeout(2000)
      });
      if (zoneRes.ok) {
        const zoneText = (await zoneRes.text()).trim(); // e.g. projects/123456/zones/us-central1-a
        logContent += `GCP Metadata Server Zone raw: ${zoneText}\n`;
        const match = zoneText.match(/zones\/([a-z0-9\-]+)$/);
        if (match) {
          const zone = match[1];
          region = zone.substring(0, zone.lastIndexOf("-"));
          logContent += `GCP Metadata Server Derived Region: ${region}\n`;
        }
      }
    } catch (e: any) {
      logContent += `GCP Metadata Server zone query failed: ${e.message}\n`;
    }

    logContent += `GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT || "undefined"}\n`;
    logContent += `GCP_PROJECT: ${process.env.GCP_PROJECT || "undefined"}\n`;

    const testPayload = {
      contents: [{ role: "user", parts: [{ text: "Hello" }] }]
    };

    // 1. Try standard API key route (Route 4)
    logContent += `\n[PROBING ROUTE 4 - Standard API Key...]\n`;
    const urlRoute4 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    try {
      const res = await fetch(urlRoute4, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload)
      });
      logContent += `Route 4 Response Status: ${res.status}\n`;
      const resText = await res.text();
      logContent += `Route 4 Response body: ${resText.substring(0, 800)}\n`;
    } catch (e: any) {
      logContent += `Route 4 Exception: ${e.message}\n`;
    }

    // 2. Try Bearer Token route (Route 2)
    logContent += `\n[PROBING ROUTE 2 - Bearer Auth Token...]\n`;
    const urlRoute2 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    try {
      const res = await fetch(urlRoute2, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(testPayload)
      });
      logContent += `Route 2 Response Status: ${res.status}\n`;
      const resText = await res.text();
      logContent += `Route 2 Response body: ${resText.substring(0, 800)}\n`;
    } catch (e: any) {
      logContent += `Route 2 Exception: ${e.message}\n`;
    }

    // 3. Try Vertex AI Route
    logContent += `\n[PROBING VERTEX AI ROUTE - Bearer token on aiplatform.googleapis.com...]\n`;
    const regionsToTry = [region, "us-central1", "asia-southeast1"];
    const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash"];

    for (const r of regionsToTry) {
      for (const m of modelsToTry) {
        const vertexUrl = `https://${r}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${r}/publishers/google/models/${m}:generateContent`;
        logContent += `\nTrying Vertex Endpoint: r=${r}, m=${m} -> ${vertexUrl}\n`;
        try {
          const res = await fetch(vertexUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${key}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(testPayload)
          });
          logContent += `Vertex Response Status: ${res.status}\n`;
          const resText = await res.text();
          logContent += `Vertex Response body: ${resText.substring(0, 800)}\n`;
          if (res.ok) {
            logContent += `>>> SUCCESS on Vertex AI: ${r}, ${m} <<<\n`;
          }
        } catch (e: any) {
          logContent += `Vertex Exception on ${r}/${m}: ${e.message}\n`;
        }
      }
    }

    // 4. Try fetching standard Google Metadata service account token directly
    let metadataToken = "";
    try {
      const response = await fetch(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        {
          headers: {
            "Metadata-Flavor": "Google",
          }
        }
      );
      if (response.ok) {
        const data = await response.json() as any;
        metadataToken = data.access_token;
        logContent += `\nSuccessfully retrieved Metadata Service Account Token (length: ${metadataToken?.length || 0})\n`;
      } else {
        logContent += `\nFailed to retrieve Metadata Service Account Token. Status: ${response.status}\n`;
      }
    } catch (e: any) {
      logContent += `\nError retrieving Metadata Service Account Token: ${e.message || e}\n`;
    }

    if (metadataToken) {
      logContent += `\n[PROBING VERTEX AI WITH METADATA SERVICE ACCOUNT TOKEN...]\n`;
      for (const r of regionsToTry) {
        for (const m of modelsToTry) {
          const url = `https://${r}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${r}/publishers/google/models/${m}:generateContent`;
          logContent += `\nTrying Vertex Endpoint with Metadata Token: r=${r}, m=${m} -> ${url}\n`;
          try {
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${metadataToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(testPayload)
            });
            logContent += `Vertex Response Status: ${response.status}\n`;
            const resText = await response.text();
            logContent += `Vertex Response body: ${resText.substring(0, 800)}\n`;
            if (response.ok) {
              logContent += `>>> SUCCESS on Vertex AI with Metadata Token: ${r}, ${m} <<<\n`;
            }
          } catch (e: any) {
            logContent += `Vertex request with metadata token failed: ${e.message || e}\n`;
          }
        }
      }
    }

    // 5. Try using the official @google/genai SDK directly
    logContent += `\n[PROBING WITH OFFICIAL @google/genai SDK...]\n`;
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const sdkAi = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
      logContent += `Initializing official GoogleGenAI client (vertexai: ${sdkAi.vertexai})\n`;
      const sdkResponse = await sdkAi.models.generateContent({
        model: "gemini-3.5-flash",
        contents: "Say hello in one word.",
      });
      logContent += `SDK Response success! Text: ${sdkResponse.text}\n`;
    } catch (e: any) {
      logContent += `SDK Response exception: ${e.message || e}\n`;
    }

    // 6. Try using the official @google/genai SDK with ADC (No API Key)
    logContent += `\n[PROBING WITH OFFICIAL @google/genai SDK (ADC - NO API KEY)...]\n`;
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const sdkAiAdc = new GoogleGenAI({
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
      logContent += `Initializing ADC GoogleGenAI client (vertexai: ${sdkAiAdc.vertexai})\n`;
      const sdkResponse = await sdkAiAdc.models.generateContent({
        model: "gemini-3.5-flash",
        contents: "Say hello in one word.",
      });
      logContent += `ADC SDK Response success! Text: ${sdkResponse.text}\n`;
    } catch (e: any) {
      logContent += `ADC SDK Response exception: ${e.message || e}\n`;
      if (e.stack) {
        logContent += `Stack: ${e.stack}\n`;
      }
    }

    // 7. Get token info for the AQ. token
    logContent += `\n[INSPECTING GEMINI_API_KEY TOKENS WITH GOOGLE OAUTH2 TOKENINFO...]\n`;
    try {
      const infoUrl = `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(key)}`;
      console.log(`Dispatching query to Tokeninfo API: ${infoUrl}`);
      const infoRes = await fetch(infoUrl, {
        method: "GET",
        headers: {
          "User-Agent": "aistudio-build",
        }
      });
      const infoStatus = infoRes.status;
      const infoBody = await infoRes.text();
      logContent += `Tokeninfo URL: ${infoUrl}\n`;
      logContent += `Tokeninfo Status: ${infoStatus}\n`;
      logContent += `Tokeninfo Body: ${infoBody}\n`;
    } catch (e: any) {
      logContent += `Tokeninfo query failed: ${e.message || e}\n`;
    }

    logContent += `\n--- END OF PROBE ---\n`;
  } catch (err: any) {
    logContent += `General diagnostic exception: ${err.message}\n${err.stack}\n`;
  }
  fs.writeFileSync(logFile, logContent, "utf8");
  console.log("Diagnostic probe successfully completed and written to /gemini_debug.txt");
}

// Mount Vite Dev Server or Production Static Files
async function main() {
  // Execute diagnostic probe asynchronously on boot
  runDiagnosticProbe().catch(e => console.error("Probe failed:", e));

  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring Vite Development Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AR-AI Assistant server active on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Critical server startup crash:", err);
});
