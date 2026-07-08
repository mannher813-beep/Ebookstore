// Supabase Edge Function: notify-new-ebook
// Deployed to project: uhedxeuzezswlmyqwvsd

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify webhook secret
    const authHeader = req.headers.get("x-webhook-secret");
    if (!authHeader) {
      console.error("Missing x-webhook-secret header");
      return new Response(JSON.stringify({ error: "Missing x-webhook-secret header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch authorized secret value from app_secrets
    const { data: secretRow, error: secretError } = await supabaseClient
      .from("app_secrets")
      .select("value")
      .eq("key", "notify_webhook_secret")
      .maybeSingle();

    if (secretError || !secretRow || secretRow.value !== authHeader) {
      console.error("Unauthorized webhook secret mismatch or error:", secretError);
      return new Response(JSON.stringify({ error: "Unauthorized: Webhook secret mismatch" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Parse payload
    const ebook = await req.json();
    console.log("Notification trigger received for ebook:", ebook);

    if (!ebook || !ebook.titre) {
      return new Response(JSON.stringify({ error: "Invalid ebook payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const ebookId = ebook.ebook_id || ebook.id;
    const description = ebook.description || "Un nouvel ebook est disponible sur EbookStore !";
    const coverUrl = ebook.url_couverture || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400";
    const price = ebook.prix || 0;

    // 3. Send Web Push Notifications
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "T4KCb-75ykcPRSMfmcvdLF4MWfy75SjlDuyRYJxjJPs";
    const vapidPublicKey = "BEWos_rKaxgZA8k1SfJvzf615UOpNy0EoohAbuiL1FrTFRsn4hO_7DiDs_cN3vfzeOwK7PfncMYQ2TwifvpSjlw";

    webpush.setVapidDetails(
      "mailto:techsen237@gmail.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    // Fetch push subscriptions
    const { data: subscriptions, error: subsError } = await supabaseClient
      .from("push_subscriptions")
      .select("*");

    if (subsError) {
      console.error("Error fetching push subscriptions:", subsError);
    }

    let pushSuccessCount = 0;
    let pushFailCount = 0;

    if (subscriptions && subscriptions.length > 0) {
      console.log(`Sending Web Push notifications to ${subscriptions.length} subscribers`);
      
      const pushPromises = subscriptions.map(async (sub) => {
        try {
          const payload = JSON.stringify({
            title: `Nouveau livre : ${ebook.titre}`,
            body: description.length > 100 ? `${description.substring(0, 97)}...` : description,
            image: coverUrl,
            ebook_id: ebookId,
            url: `/ebook/${ebookId}`
          });

          await webpush.sendNotification(sub.subscription, payload);
          pushSuccessCount++;
        } catch (err) {
          pushFailCount++;
          console.error(`Error sending push notification to subscriber ID ${sub.id}:`, err);
          // Clean up expired or missing subscriptions (410 Gone, 404 Not Found)
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Cleaning up expired subscription ID ${sub.id}`);
            await supabaseClient.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      });

      await Promise.all(pushPromises);
    } else {
      console.log("No active push subscriptions found");
    }

    // 4. Fetch Registered Users and Send Transactional Emails via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSuccessCount = 0;
    let emailFailCount = 0;

    if (resendApiKey) {
      const { data: usersData, error: usersError } = await supabaseClient.auth.admin.listUsers();
      
      if (usersError) {
        console.error("Error fetching users from Supabase Auth admin API:", usersError);
      } else if (usersData && usersData.users && usersData.users.length > 0) {
        const users = usersData.users;
        console.log(`Preparing email notifications for ${users.length} registered users`);

        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="background-color: #e0e7ff; color: #4f46e5; font-size: 11px; font-weight: bold; letter-spacing: 1px; padding: 6px 12px; border-radius: 9999px; text-transform: uppercase;">NOUVEAUTÉ</span>
            </div>
            <h2 style="color: #4f46e5; text-align: center; margin-top: 10px; font-weight: 800;">Nouveau livre disponible sur EbookStore Afrique !</h2>
            <div style="text-align: center; margin: 24px 0;">
              <img src="${coverUrl}" alt="${ebook.titre}" style="max-width: 180px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);" />
            </div>
            <h3 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 700; text-align: center;">${ebook.titre}</h3>
            <p style="color: #475569; line-height: 1.6; font-size: 14px; text-align: center; padding: 0 10px;">
              ${description}
            </p>
            <div style="background-color: #f1f5f9; padding: 14px; border-radius: 12px; text-align: center; margin: 24px 0;">
              <span style="font-size: 16px; font-weight: bold; color: #1e293b;">Prix de lancement : </span>
              <span style="font-size: 20px; font-weight: 800; color: #4f46e5;">${price} FCFA</span>
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="https://ebookstore-73b.pages.dev/ebook/${ebookId}" style="background-color: #4f46e5; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Accéder aux Détails & Acheter</a>
            </div>
            <p style="font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 30px;">
              Vous recevez cet email car vous êtes membre d'EbookStore Afrique.
            </p>
          </div>
        `;

        // Process in batches of 50
        const batchSize = 50;
        for (let i = 0; i < users.length; i += batchSize) {
          const chunk = users.slice(i, i + batchSize);
          console.log(`Processing email batch from index ${i} to ${i + chunk.length}`);

          const emailPromises = chunk.map(async (userObj) => {
            const email = userObj.email;
            if (!email) return;

            try {
              const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${resendApiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  from: "EbookStore <onboarding@resend.dev>",
                  to: email,
                  subject: `🚀 Nouveau livre disponible : ${ebook.titre}`,
                  html: emailHtml
                })
              });

              if (response.ok) {
                emailSuccessCount++;
              } else {
                emailFailCount++;
                const errText = await response.text();
                console.error(`Resend API rejection for email ${email}:`, errText);
              }
            } catch (err) {
              emailFailCount++;
              console.error(`Resend transmission error for email ${email}:`, err);
            }
          });

          await Promise.all(emailPromises);

          if (i + batchSize < users.length) {
            // Pause 1 second between chunks to avoid rate-limiting
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } else {
        console.log("No registered users found in Auth system to notify");
      }
    } else {
      console.log("RESEND_API_KEY environment variable not set, skipping email notifications");
    }

    return new Response(
      JSON.stringify({
        status: "success",
        web_push: { sent: pushSuccessCount, failed: pushFailCount },
        emails: { sent: emailSuccessCount, failed: emailFailCount }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    console.error("Critical error in notify-new-ebook function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
