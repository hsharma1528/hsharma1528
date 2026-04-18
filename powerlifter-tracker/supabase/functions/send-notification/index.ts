import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
const TWILIO_AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')  ?? ''
const TWILIO_FROM        = Deno.env.get('TWILIO_FROM')        ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, message, channel = 'sms' } = await req.json()

    if (!to || !message) {
      return new Response(JSON.stringify({ error: 'Missing to or message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const fromNum = channel === 'whatsapp' ? `whatsapp:${TWILIO_FROM}` : TWILIO_FROM
    const toNum   = channel === 'whatsapp' ? `whatsapp:${to}`          : to

    const params = new URLSearchParams({ From: fromNum, To: toNum, Body: message })

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method:  'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          'Content-Type':  'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Twilio error' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ sid: data.sid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
