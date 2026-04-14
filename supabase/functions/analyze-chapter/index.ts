import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  const startTime = Date.now();
  
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

    console.log(`Analyzing Chapter: ${chapterId} (${chapterText.length} chars, approx ${Math.round(chapterText.length / 4)} tokens)`)

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

    // 4. DYNAMIC MODEL DISCOVERY & SCORING
    async function getDynamicFallbackChain(key: string) {
      const defaultModels = ["gemini-3.1-pro", "gemini-3-flash", "gemini-1.5-pro"];
      try {
        console.log("Fetching live model list from Google...");
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
        if (!res.ok) return defaultModels;
        const data = await res.json();
        
        const scoredModels = (data.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => {
            const name = m.name.replace("models/", "");
            let score = 0;
            
            // 2026 Scoring Logic
            if (name.includes("pro")) score += 100;
            if (name.includes("flash")) score += 50;
            if (name.includes("3.1")) score += 20;
            else if (name.includes("3.0")) score += 10;
            else if (name.includes("2.0")) score += 5;
            
            // Penalize experimental/preview for stability
            if (name.includes("-exp") || name.includes("-preview") || name.includes("-beta")) score -= 30;
            
            return { name, score };
          })
          .sort((a: any, b: any) => b.score - a.score)
          .map((m: any) => m.name);

        console.log("Dynamic Fallback Chain established:", scoredModels.slice(0, 5).join(", "));
        return scoredModels.length > 0 ? scoredModels : defaultModels;
      } catch (e) {
        console.warn("Dynamic discovery failed, using hardcoded defaults.");
        return defaultModels;
      }
    }

    const modelFallbackChain = await getDynamicFallbackChain(GEMINI_API_KEY);
    const maxRetriesPerModel = 1; 
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    let aiResponse: Response | null = null;
    let lastError: string = "";
    let finalModel = "";

    // 5. RESILIENT CALL LOOP
    outerLoop:
    for (const currentModel of modelFallbackChain) {
      finalModel = currentModel;
      
      for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
        // GLOBAL TIMEOUT GUARD: Stop if we are within 15s of the 60s limit
        const elapsed = Date.now() - startTime;
        if (elapsed > 45000) {
          console.warn(`Global timeout reached (${elapsed}ms). Breaking loops.`);
          lastError = "Edge Function reached internal timeout (45s) while retrying.";
          break outerLoop;
        }

        if (attempt > 0) {
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
            break outerLoop; 
          }

          const errorBody = await aiResponse.text();
          lastError = `Status ${aiResponse.status}: ${errorBody}`;
          
          if (aiResponse.status === 404) {
            console.error(`Model ${currentModel} not found (404). Rotating model...`);
            break; 
          } else if (aiResponse.status === 503 || aiResponse.status === 429) {
            console.warn(`Gemini busy/overloaded (Status ${aiResponse.status}) for ${currentModel}. Waiting 2s breathing room...`);
            await delay(2000); 
          } else {
            throw new Error(`Critical Gemini Error: ${lastError}`);
          }
        } catch (e: any) {
          if (e.message.includes("Critical")) throw e;
          console.error(`Request failed for ${currentModel}:`, e.message);
          lastError = e.message;
        }
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

    // Standardize all error responses to 200 OK so the frontend can parse the JSON error
    // instead of getting a generic "non-2xx" error from Supabase SDK.
    return new Response(
      JSON.stringify({
        error: errorMsg,
        details: error.stack,
        suggestion: errorMsg.includes("GEMINI_API_KEY")
          ? "Ensure GEMINI_API_KEY is set in your Supabase Secrets."
          : errorMsg.includes("429") || errorMsg.includes("Quota")
          ? "Check your Gemini API quota or upgrade to a paid plan."
          : "Try again in a few minutes."
      }),
      {
        status: 200, // Return 200 even for errors for cleaner frontend handling
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})