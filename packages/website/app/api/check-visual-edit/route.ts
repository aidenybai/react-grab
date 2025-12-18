const IS_HEALTHY = true;

const getCorsHeaders = () => {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};

export const OPTIONS = () => {
  const corsHeaders = getCorsHeaders();
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const GET = () => {
  const corsHeaders = getCorsHeaders();
  return Response.json(
    { healthy: IS_HEALTHY },
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
};
