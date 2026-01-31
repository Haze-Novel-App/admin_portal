import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

  try {
    // We call the v1beta 'models' endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    )

    const data = await response.json()

    // Filter to find models that support "generateContent"
    const validModels = data.models?.filter((m: any) => 
      m.supportedGenerationMethods?.includes("generateContent")
    ).map((m: any) => m.name)

    console.log("AVAILABLE MODELS:", JSON.stringify(validModels, null, 2))

    return new Response(JSON.stringify(data), { 
      headers: { "Content-Type": "application/json" } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})