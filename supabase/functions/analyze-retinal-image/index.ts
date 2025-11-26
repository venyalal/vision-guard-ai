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
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are an expert ophthalmologist AI specializing in diabetic retinopathy (DR) detection and grading from fundus photographs.

CRITICAL CLASSIFICATION CRITERIA (International Clinical DR Scale):

Grade 0 (No DR):
- Clear, healthy retina
- No microaneurysms, hemorrhages, or other abnormalities
- Normal optic disc, macula, and vessels

Grade 1 (Mild NPDR):
- Microaneurysms ONLY (tiny red dots, <125 μm)
- No other retinal abnormalities

Grade 2 (Moderate NPDR):
- More extensive findings than mild NPDR:
  • Multiple microaneurysms
  • Dot/blot hemorrhages
  • Hard exudates (yellow lipid deposits)
  • Cotton wool spots (soft exudates)
  • Mild venous beading in <2 quadrants
- Does NOT meet criteria for severe NPDR

Grade 3 (Severe NPDR - "4-2-1 Rule"):
ANY ONE of the following:
  • Severe hemorrhages in all 4 quadrants
  • Venous beading in 2+ quadrants
  • IRMA (intraretinal microvascular abnormalities) in 1+ quadrant

Grade 4 (Proliferative DR - PDR):
ANY ONE of the following:
  • Neovascularization of disc (NVD) or elsewhere (NVE)
  • Vitreous hemorrhage or preretinal hemorrhage
  • Fibrous proliferation
  • Tractional retinal detachment

ANALYSIS APPROACH:
1. Systematically examine: optic disc → macula → vessels → periphery (4 quadrants)
2. Count and grade lesions precisely
3. Be conservative: if uncertain between grades, classify as lower grade
4. For Grade 4, look for neovascularization (fine vessels on disc or retinal surface)`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this fundus photograph for diabetic retinopathy. 

STEP-BY-STEP:
1. Examine image quality and field of view
2. Systematically identify ALL lesions present
3. Count and classify each lesion type
4. Apply ICDR classification criteria strictly
5. Determine final DR grade (0-4)
6. Provide specific clinical recommendation based on grade

Be precise and thorough in your analysis.`
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
              description: "Classify diabetic retinopathy severity and provide clinical analysis",
              parameters: {
                type: "object",
                properties: {
                  grade: {
                    type: "integer",
                    description: "DR severity grade (0=No DR, 1=Mild NPDR, 2=Moderate NPDR, 3=Severe NPDR, 4=Proliferative DR)",
                    enum: [0, 1, 2, 3, 4]
                  },
                  confidence: {
                    type: "integer",
                    description: "Classification confidence percentage (0-100)",
                    minimum: 0,
                    maximum: 100
                  },
                  gradeName: {
                    type: "string",
                    description: "Human-readable grade name",
                    enum: ["No DR", "Mild NPDR", "Moderate NPDR", "Severe NPDR", "Proliferative DR"]
                  },
                  recommendation: {
                    type: "string",
                    description: "Specific clinical recommendation based on grade (referral timeline, monitoring frequency)"
                  },
                  features: {
                    type: "array",
                    description: "List of specific DR lesions identified in the image",
                    items: {
                      type: "string"
                    }
                  },
                  reasoning: {
                    type: "string",
                    description: "Detailed clinical reasoning for the classification, citing specific findings and their locations"
                  }
                },
                required: ["grade", "confidence", "gradeName", "recommendation", "features", "reasoning"],
                additionalProperties: false
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
