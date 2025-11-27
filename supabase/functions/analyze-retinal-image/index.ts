import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing retinal image with AI...');
    const startTime = Date.now();
    
    // Call Lovable AI with vision capabilities and structured output for reliable DR detection
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert ophthalmologist AI specializing in diabetic retinopathy (DR) detection and grading from fundus photographs.

Analyze this retinal fundus image using the International Clinical Diabetic Retinopathy (ICDR) Disease Severity Scale:

**Grade 0 (No DR):**
- Clear, healthy retina
- No microaneurysms, hemorrhages, or lesions
- Normal optic disc, macula, and blood vessels
- Recommendation: Annual screening

**Grade 1 (Mild NPDR):**
- Microaneurysms ONLY (small red dots)
- No other abnormalities
- Recommendation: 6-12 month follow-up

**Grade 2 (Moderate NPDR):**
- Multiple microaneurysms
- Retinal hemorrhages (dot/blot)
- Hard exudates (yellow deposits)
- Cotton wool spots
- Mild venous beading
- Recommendation: 3-6 month follow-up, consider ophthalmology referral

**Grade 3 (Severe NPDR - 4-2-1 Rule):**
ANY of:
- Severe hemorrhages in all 4 quadrants
- Venous beading in 2+ quadrants
- IRMA in 1+ quadrant
- Recommendation: Urgent referral within 1 month, risk of progression to PDR

**Grade 4 (Proliferative DR):**
ANY of:
- Neovascularization (new abnormal blood vessels)
- Vitreous/preretinal hemorrhage
- Fibrous proliferation
- Tractional retinal detachment
- Recommendation: IMMEDIATE ophthalmology referral (within 1 week), high risk of vision loss

**Analysis Instructions:**
1. Examine image systematically: optic disc → macula → blood vessels → 4 retinal quadrants
2. Identify ALL visible lesions with precise locations
3. Count microaneurysms, hemorrhages, exudates
4. Check for neovascularization (fine new vessels)
5. Assign grade based on worst finding
6. Provide confidence (0-100%) and detailed reasoning
7. List specific features found
8. Give appropriate clinical recommendation

Provide your analysis using the classify_diabetic_retinopathy function with accurate findings.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_diabetic_retinopathy",
              description: "Classify diabetic retinopathy severity grade from 0-4 with clinical details",
              parameters: {
                type: "object",
                properties: {
                  grade: {
                    type: "number",
                    description: "DR grade: 0=No DR, 1=Mild NPDR, 2=Moderate NPDR, 3=Severe NPDR, 4=Proliferative DR"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence percentage 0-100"
                  },
                  gradeName: {
                    type: "string",
                    description: "Grade name: No DR, Mild NPDR, Moderate NPDR, Severe NPDR, or Proliferative DR"
                  },
                  recommendation: {
                    type: "string",
                    description: "Clinical recommendation with timeline"
                  },
                  features: {
                    type: "array",
                    description: "List of specific lesions and findings",
                    items: { type: "string" }
                  },
                  reasoning: {
                    type: "string",
                    description: "Detailed analysis with locations of findings"
                  }
                },
                required: ["grade", "confidence", "gradeName", "recommendation", "features", "reasoning"]
              }
            }
          }
        ],
        tool_choice: { 
          type: "function", 
          function: { name: "classify_diabetic_retinopathy" } 
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI analysis failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');

    let result;
    try {
      // Extract structured output from tool call
      const toolCall = data.choices[0].message.tool_calls?.[0];
      
      if (!toolCall || toolCall.function.name !== 'classify_diabetic_retinopathy') {
        throw new Error('No valid tool call in response');
      }
      
      result = JSON.parse(toolCall.function.arguments);
      
      // Validate result structure
      if (typeof result.grade !== 'number' || result.grade < 0 || result.grade > 4) {
        throw new Error(`Invalid grade value: ${result.grade}`);
      }
      
      if (!result.gradeName || !result.recommendation) {
        throw new Error('Missing required fields in response');
      }
      
      // Calculate actual scan time
      const scanTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // Add metadata
      result.timestamp = new Date().toLocaleString();
      result.scanTime = `${scanTime}s`;
      
      console.log('Analysis complete:', {
        grade: result.grade,
        confidence: result.confidence,
        gradeName: result.gradeName,
        featuresCount: result.features?.length || 0
      });
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Response data:', JSON.stringify(data, null, 2));
      
      // Fallback result if parsing fails
      result = {
        grade: 0,
        confidence: 70,
        gradeName: "Analysis Error",
        recommendation: "⚠️ Unable to complete automated analysis. Please consult an ophthalmologist for professional diagnosis.",
        features: [],
        reasoning: "Technical error during image classification. Manual expert review required.",
        timestamp: new Date().toLocaleString(),
        scanTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
      };
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in analyze-retinal-image:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
