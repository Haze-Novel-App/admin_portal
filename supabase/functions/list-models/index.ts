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

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not set in Secrets" }), {
      status: 200, // Return 200 so the frontend can show the custom error
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  try {
    console.log("Fetching available Gemini models...")
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`
    )

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json()

    // Filter and sort models: put newest and stable ones first
    const validModels = (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: any) => m.name.replace("models/", ""))
      .sort((a: string, b: string) => b.localeCompare(a)); // Generally puts 'gemini-3' before 'gemini-1'

    console.log("Found models:", validModels.length);

    return new Response(JSON.stringify({ models: validModels, raw: data }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (error: any) {
    console.error("List Models Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})