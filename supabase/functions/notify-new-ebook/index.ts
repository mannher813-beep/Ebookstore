// Supabase Edge Function: notify-new-ebook
// Deployed to project: uhedxeuzezswlmyqwvsd

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface EmailTemplateOptions {
  isAffiliate: boolean;
  referralCode?: string;
}

function buildEbookEmailTemplate(ebook: any, options: EmailTemplateOptions): string {
  const ebookId = ebook.id || ebook.ebook_id;
  const baseUrl = "https://ebookstore-73b.pages.dev";
  const bookUrl = options.isAffiliate && options.referralCode
    ? `${baseUrl}/ebook/${ebookId}?ref=${options.referralCode}`
    : `${baseUrl}/ebook/${ebookId}`;

  const isFree = ebook.prix === 0 || !ebook.prix;
  const displayPrice = isFree ? "GRATUIT" : `${ebook.prix} FCFA`;
  
  // Truncate description to 2-3 sentences
  const rawDesc = ebook.description || "Un nouvel ebook est disponible sur EbookStore Afrique !";
  const sentences = rawDesc.split(/(?<=[.!?])\s+/);
  let shortDesc = sentences.slice(0, 3).join(" ");
  if (shortDesc.length > 250) {
    shortDesc = shortDesc.substring(0, 247) + "...";
  }

  const primaryBtnText = isFree ? "Télécharger Gratuitement" : "Acheter Maintenant";
  const coverUrl = ebook.url_couverture || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau livre disponible</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px; text-align: center;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <span style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; font-family: sans-serif;">
                      EbookStore <span style="color: #6366f1;">Afrique</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <span style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-size: 11px; font-weight: bold; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase;">
                      Nouvel Ebook Disponible 🎉
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cover Image -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${coverUrl}" alt="${ebook.titre}" style="max-width: 200px; width: 100%; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04); display: block;" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px 30px 40px; text-align: center;">
              <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 16px 0; tracking-tight: -0.5px;">
                ${ebook.titre}
              </h1>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                ${shortDesc}
              </p>
              
              <!-- Price Badge -->
              <div style="display: inline-block; background-color: #f1f5f9; border-radius: 14px; padding: 12px 24px; margin-bottom: 28px;">
                <span style="font-size: 14px; color: #64748b; font-weight: 500; display: block; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Prix</span>
                <span style="font-size: 22px; color: ${isFree ? "#10b981" : "#4f46e5"}; font-weight: 800; display: block; letter-spacing: -0.5px;">
                  ${displayPrice}
                </span>
              </div>

              <!-- Action Button -->
              <div style="margin-bottom: ${options.isAffiliate ? "16px" : "0px"};">
                <a href="${bookUrl}" target="_blank" style="display: block; background-color: #4f46e5; color: #ffffff; font-size: 15px; font-weight: bold; text-decoration: none; padding: 14px 30px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3); transition: background-color 0.2s;">
                  ${primaryBtnText}
                </a>
              </div>

              <!-- Affiliate Share Button (Optional) -->
              ${options.isAffiliate ? `
              <div style="margin-top: 12px;">
                <a href="${bookUrl}" target="_blank" style="display: block; background-color: #ffffff; color: #4f46e5; border: 2px solid #4f46e5; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  📢 Partager mon Lien Affilié
                </a>
              </div>
              ` : ''}

            </td>
          </tr>

          <!-- Footer Legal -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 40px; text-align: center;">
              <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0 0 16px 0;">
                Vous recevez cet email car vous êtes inscrit sur EbookStore Afrique. Pour gérer vos préférences, connectez-vous à votre espace personnel.
              </p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="font-size: 11px; font-weight: 600;">
                    <a href="${baseUrl}/?view=politique-de-confidentialite" style="color: #64748b; text-decoration: none; margin: 0 10px;">Confidentialité</a>
                    <span style="color: #cbd5e1;">|</span>
                    <a href="${baseUrl}/?view=conditions-generales" style="color: #64748b; text-decoration: none; margin: 0 10px;">CGU & CGV</a>
                  </td>
                </tr>
              </table>
              <p style="color: #94a3b8; font-size: 10px; margin: 16px 0 0 0; font-family: monospace;">
                &copy; 2026 EbookStore Afrique. Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

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

        // Fetch already notified users to avoid duplicates
        const { data: sentLogs, error: logsError } = await supabaseClient
          .from("email_notification_log")
          .select("user_id")
          .eq("ebook_id", ebookId);

        if (logsError) {
          console.error("Error fetching email notification logs:", logsError);
        }
        const notifiedUserIds = new Set(sentLogs?.map((log: any) => log.user_id) || []);

        // Fetch all active approved affiliates to build a map of user_id -> referral_code
        const { data: affiliatesList, error: affError } = await supabaseClient
          .from("affiliates")
          .select("user_id, referral_code")
          .eq("activated", true)
          .eq("status", "approved");

        if (affError) {
          console.error("Error fetching active affiliates:", affError);
        }
        const affiliateMap = new Map<string, string>();
        affiliatesList?.forEach((aff: any) => {
          if (aff.user_id && aff.referral_code) {
            affiliateMap.set(aff.user_id, aff.referral_code);
          }
        });

        // Filter out users who have already been notified
        const usersToNotify = users.filter((u: any) => u.id && !notifiedUserIds.has(u.id));
        console.log(`Of ${users.length} registered users, ${usersToNotify.length} need to be notified for ebook ${ebookId}`);

        // Process in batches of 50
        const batchSize = 50;
        for (let i = 0; i < usersToNotify.length; i += batchSize) {
          const chunk = usersToNotify.slice(i, i + batchSize);
          console.log(`Processing email batch from index ${i} to ${i + chunk.length}`);

          const emailPromises = chunk.map(async (userObj: any) => {
            const email = userObj.email;
            const userId = userObj.id;
            if (!email || !userId) return;

            const isAffiliate = affiliateMap.has(userId);
            const referralCode = affiliateMap.get(userId);

            const emailHtml = buildEbookEmailTemplate(ebook, {
              isAffiliate,
              referralCode
            });

            let statut: 'sent' | 'failed' = 'failed';
            let erreur: string | null = null;

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
                statut = 'sent';
              } else {
                emailFailCount++;
                erreur = await response.text();
                console.error(`Resend API rejection for email ${email}:`, erreur);
              }
            } catch (err: any) {
              emailFailCount++;
              erreur = err.message || String(err);
              console.error(`Resend transmission error for email ${email}:`, err);
            }

            // Record result in email_notification_log
            try {
              const { error: insertError } = await supabaseClient
                .from("email_notification_log")
                .insert({
                  ebook_id: ebookId,
                  user_id: userId,
                  statut,
                  erreur
                });
              if (insertError) {
                console.error(`Error logging email notification for user ${userId}:`, insertError);
              }
            } catch (logErr) {
              console.error(`Unexpected exception logging email for user ${userId}:`, logErr);
            }
          });

          await Promise.all(emailPromises);

          if (i + batchSize < usersToNotify.length) {
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

  } catch (err: any) {
    console.error("Critical error in notify-new-ebook function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
