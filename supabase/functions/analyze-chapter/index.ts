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

    // Helper to find an available Gemini model
    async function getBestModel(key: string) {
      const defaultModel = "gemini-2.5-flash";
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

    // 5. Call Gemini API - Modernized for 2026 availability
    let model = "gemini-2.5-flash"
    let aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ 
            parts: [{ text: prompt }] 
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        })
      }
    )

    // FALLBACK: If 404, try auto-discovering a valid model
    if (aiResponse.status === 404) {
      console.warn(`Model ${model} not found. Attempting auto-discovery...`)
      model = await getBestModel(GEMINI_API_KEY)
      console.log(`Discovered available model: ${model}`)
      
      aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
          })
        }
      )
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error("Gemini API HTTP Error:", aiResponse.status, errorText)
      throw new Error(`Gemini API returned ${aiResponse.status} using model ${model}. Details: ${errorText}`)
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