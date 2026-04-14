import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Check Secrets - FIXED: Correct environment variable name
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not found in environment variables")
      throw new Error("Missing GEMINI_API_KEY in Secrets. Please set it in Supabase Dashboard.")
    }

    // 3. Parse Request
    const { chapterId, chapterText } = await req.json()

    if (!chapterId) {
      throw new Error("Missing chapterId in request")
    }

    if (!chapterText || chapterText.length < 5) {
      throw new Error("Chapter text is empty or too short.")
    }

    console.log(`Analyzing Chapter: ${chapterId} (${chapterText.length} chars)`)

    // 4. Construct Prompt
    const prompt = `
You are an expert literary editor. Analyze the provided book chapter.

CRITICAL INSTRUCTION: Return ONLY valid JSON. Do not include markdown formatting (like \`\`\`json). Do not include introductory text or explanations.

JSON Structure (use this exact format):
{
  "genre": { 
    "primary": "String", 
    "sub_genres": ["String"], 
    "target_audience": "String" 
  },
  "overview": { 
    "summary": "String", 
    "themes": ["String"], 
    "emotional_tone": "String" 
  },
  "classification": { 
    "type": "String", 
    "pacing": "String" 
  },
  "sensitivity": {
    "vulgarity": { "detected": false, "examples": "", "context": "" },
    "sexual_content": { "detected": false, "examples": "", "context": "" },
    "violence": { "detected": false, "examples": "", "context": "" },
    "substance_use": { "detected": false, "examples": "", "context": "" },
    "hate_speech": { "detected": false, "examples": "", "context": "" }
  },
  "style": { 
    "tone": "String", 
    "writing_style": "String", 
    "patterns": "String" 
  }
}

CHAPTER TEXT:
${chapterText.substring(0, 25000)}
    `.trim()

    // Helper to find an available Gemini model (Self-healing fallback)
    async function getBestModel(key: string) {
      const defaultModel = "gemini-1.5-flash";
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
        if (!listRes.ok) return defaultModel;
        const listData = await listRes.json();
        const flashModel = listData.models?.find((m: any) => 
          m.name.includes("flash") && m.supportedGenerationMethods?.includes("generateContent")
        );
        return flashModel ? flashModel.name.replace("models/", "") : defaultModel;
      } catch (e) {
        console.warn("Could not list models for auto-discovery, using default:", e);
        return defaultModel;
      }
    }

    // Resilience Configuration: Models to try in order and limits
    const modelFallbackChain = ["gemini-3.1-flash-lite", "gemini-1.5-flash", "gemini-2.0-flash-exp"];
    const maxRetriesPerModel = 2; // Try each model up to 3 times (1 initial + 2 retries)
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    let aiResponse: Response | null = null;
    let lastError: string = "";
    let finalModel = "";

    // OPTIONAL: Try to auto-discover the best model for this key if the chain is failing
    // We'll append the discovered model to the chain if needed
    
    // 5. RESILIENT CALL LOOP
    outerLoop:
    for (const currentModel of modelFallbackChain) {
      finalModel = currentModel;
      
      for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
        if (attempt > 0) {
          // Exponential backoff with jitter: 2^attempt * 1000 + random
          const waitTime = (Math.pow(2, attempt) * 1000) + (Math.random() * 1000);
          console.warn(`Retry attempt ${attempt} for model ${currentModel}. Waiting ${Math.round(waitTime)}ms...`);
          await delay(waitTime);
        }

        try {
          console.log(`Calling Gemini API (Model: ${currentModel}, Attempt: ${attempt + 1})...`);
          
          aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${currentModel}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 8192,
                }
              })
            }
          );

          if (aiResponse.ok) {
            console.log(`Success on model ${currentModel}!`);
            break outerLoop; // Success! Exit both loops.
          }

          // Handle specific retryable errors
          const errorBody = await aiResponse.text();
          lastError = `Status ${aiResponse.status}: ${errorBody}`;
          
          if (aiResponse.status === 404) {
            console.error(`Model ${currentModel} not found (404). Rotating model...`);
            break; // Skip to next model immediately
          } else if (aiResponse.status === 503 || aiResponse.status === 429) {
            console.warn(`Gemini busy/overloaded (Status ${aiResponse.status}) for ${currentModel}.`);
            // Continue to next attempt in inner loop
          } else {
            // Non-retryable error (e.g. 400 Bad Request)
            throw new Error(`Critical Gemini Error: ${lastError}`);
          }
        } catch (e: any) {
          if (e.message.includes("Critical")) throw e;
          console.error(`Request failed for ${currentModel}:`, e.message);
          lastError = e.message;
        }
      }
      
      console.warn(`${currentModel} failed after max retries. Trying next model...`);
    }

    if (!aiResponse || !aiResponse.ok) {
      // LAST RESORT: Try auto-discovery
      console.warn("Standard models failed. Attempting auto-discovery...");
      const discoveredModel = await getBestModel(GEMINI_API_KEY);
      if (discoveredModel && !modelFallbackChain.includes(discoveredModel)) {
        console.log(`Auto-discovered model: ${discoveredModel}. Final attempt...`);
        aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${discoveredModel}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
            })
          }
        );
      }
    }

    if (!aiResponse || !aiResponse.ok) {
      const status = aiResponse?.status || "Unknown";
      throw new Error(`AI Review failed. Final Status: ${status}. Error Detail: ${lastError}`);
    }

    const aiData = await aiResponse.json()

    // 6. Handle Gemini Errors
    if (aiData.error) {
      console.error("Gemini API Error:", aiData.error)
      throw new Error(`Gemini API Error: ${aiData.error.message}`)
    }

    if (!aiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Empty Response from Gemini:", JSON.stringify(aiData, null, 2))
      throw new Error("Gemini returned no text content.")
    }

    // 7. ROBUST JSON PARSING
    let rawText = aiData.candidates[0].content.parts[0].text.trim()
    console.log("Raw Gemini Response:", rawText.substring(0, 500)) // Log first 500 chars

    // Remove markdown code blocks if present
    rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '')

    // Find the first '{' and the last '}' to extract only the JSON part
    const jsonStartIndex = rawText.indexOf('{')
    const jsonEndIndex = rawText.lastIndexOf('}')

    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      console.error("No JSON object found in response:", rawText)
      throw new Error("Gemini did not return valid JSON format.")
    }

    const jsonString = rawText.substring(jsonStartIndex, jsonEndIndex + 1)

    let report
    try {
      report = JSON.parse(jsonString)
    } catch (parseError: any) {
      console.error("JSON Parse Error:", parseError)
      console.error("Attempted to parse:", jsonString.substring(0, 500))
      throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`)
    }

    console.log("Analysis completed successfully for chapter:", chapterId)

    // 8. Return Success
    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    const errorMsg = error.message || "Unknown internal error";
    console.error("Function Error:", errorMsg);

    return new Response(
      JSON.stringify({
        error: errorMsg,
        details: error.stack,
        suggestion: errorMsg.includes("GEMINI_API_KEY")
          ? "Ensure GEMINI_API_KEY is set in your Supabase Secrets."
          : "Check your Gemini API quota or model settings."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})