import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PIXEL_ID = Deno.env.get("META_PIXEL_ID") ?? "";
const ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashSHA256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { event_name, event_time, user_data, custom_data } = body;

    const hashedPhone = user_data?.phone
      ? await hashSHA256(user_data.phone)
      : undefined;

    const payload = {
      data: [
        {
          event_name,
          event_time,
          action_source: "website",
          user_data: {
            ph: hashedPhone ? [hashedPhone] : undefined,
          },
          custom_data: {
            value: custom_data?.value,
            currency: custom_data?.currency ?? "XOF",
            content_name: custom_data?.content_name,
            content_type: "product",
          },
        },
      ],
    };

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
