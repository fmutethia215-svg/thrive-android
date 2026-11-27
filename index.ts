import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jwt) return new Response(JSON.stringify({ error: "Sign in required" }), { status: 401, headers: cors });
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const key = Deno.env.get("THRIVE_AI_API_KEY");
    const provider = (Deno.env.get("THRIVE_AI_PROVIDER") || "gemini").toLowerCase(); // gemini | openai | anthropic
    const model = Deno.env.get("THRIVE_AI_MODEL") || (provider === "openai" ? "gpt-4o-mini" : provider === "anthropic" ? "claude-sonnet-5-5" : "gemini-2.5-flash");
    const base = (Deno.env.get("THRIVE_AI_BASE_URL") || "https://api.openai.com/v1").replace(/\/+$/, ""); // any OpenAI-compatible server
    if (!url || !anon || !key) return new Response(JSON.stringify({ error: "AI server secret is not configured" }), { status: 503, headers: cors });
    const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
    const { data: ud, error: ue } = await sb.auth.getUser(jwt);
    if (ue || !ud.user) return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401, headers: cors });
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
    const system = typeof body.system === "string" ? body.system.slice(0, 12000) : "You are Thrive, a practical personal-growth assistant.";
    if (!messages.length || !messages.every((m: any) => ["user","assistant"].includes(m.role) && typeof m.content === "string")) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), { status: 400, headers: cors });
    }
    const maxTokens = Math.min(Math.max(Number(body.max_tokens) || 1200, 200), 2000);
    let answer = "", sources: any[] = [];
    if (provider === "gemini") {
      const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content.slice(0, 8000) }] })),
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
          ...(body.search === true ? { tools: [{ google_search: {} }] } : {})
        })
      });
      const result = await upstream.json();
      if (!upstream.ok) return new Response(JSON.stringify({ error: "AI provider request failed", status: upstream.status, detail: result?.error?.message || "Check provider key, model and quota." }), { status: 502, headers: cors });
      answer = (result.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
      sources = (result.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map((c: any) => c.web).filter(Boolean).map((w: any) => ({ u: w.uri, t: w.title || "source" }));
    } else if (provider === "anthropic") {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: messages.map((m: any) => ({ role: m.role, content: m.content.slice(0, 8000) })) })
      });
      const result = await upstream.json();
      if (!upstream.ok) return new Response(JSON.stringify({ error: "AI provider request failed", status: upstream.status, detail: result?.error?.message || "Check provider key, model and quota." }), { status: 502, headers: cors });
      answer = (result.content || []).map((c: any) => c.text || "").join("");
    } else {
      const upstream = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "system", content: system }, ...messages.map((m: any) => ({ role: m.role, content: m.content.slice(0, 8000) }))] })
      });
      const result = await upstream.json();
      if (!upstream.ok) return new Response(JSON.stringify({ error: "AI provider request failed", status: upstream.status, detail: result?.error?.message || "Check provider key, model and quota." }), { status: 502, headers: cors });
      answer = result.choices?.[0]?.message?.content || "";
    }
    if (!answer) return new Response(JSON.stringify({ error: "AI returned no text" }), { status: 502, headers: cors });
    return new Response(JSON.stringify({ text: answer, sources }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Unexpected AI service error", detail: String((e as Error)?.message || e) }), { status: 500, headers: cors });
  }
});
