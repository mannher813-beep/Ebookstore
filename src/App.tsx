import React, { useState, useEffect } from "react";
import { CreditCard, Phone, Shield, ShoppingBag, X, AlertTriangle, RefreshCw, KeyRound, CheckCircle2, Download } from "lucide-react";
import Header from "./components/Header";
import EbookCard from "./components/EbookCard";
import BookDetailModal from "./components/BookDetailModal";
import AuthModal from "./components/AuthModal";
import AdminPanel from "./components/AdminPanel";
import PurchaseList from "./components/PurchaseList";
import AffiliatePortal from "./components/AffiliatePortal";
import AboutSection from "./components/AboutSection";
import PolitiqueConfidentialite from "./components/PolitiqueConfidentialite";
import ConditionsGenerales from "./components/ConditionsGenerales";
import MentionsLegales from "./components/MentionsLegales";
import { Ebook, Achat, PaymentStatus } from "./types";
import { hasSupabaseKeys, supabase, API_BASE_URL } from "./supabaseClient";

// Helper to convert VAPID public key to Uint8Array for Push API subscription
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function App() {
  // Navigation & Views
  const [currentView, setView] = useState<string>("home"); // home, catalog, my-purchases, admin
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedEbook, setSelectedEbook] = useState<Ebook | null>(null);

  // Users & Auth States
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [role, setRole] = useState<string>("user"); // user | admin

  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Affiliate States
  const [userAffiliate, setUserAffiliate] = useState<any | null>(null);
  const [loadingAffiliate, setLoadingAffiliate] = useState(false);

  // Catalogs & Transactions
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [purchases, setPurchases] = useState<Achat[]>([]);
  const [loadingEbooks, setLoadingEbooks] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Payment checkout form state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutEbook, setCheckoutEbook] = useState<Ebook | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [countryCode, setCountryCode] = useState("+237");
  const [clientNameInput, setClientNameInput] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Downloading State
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Success notification banner state
  const [successNotification, setSuccessNotification] = useState<{ show: boolean; message: string } | null>(null);

  // Diagnostic Config Status Overview
  const [configStatus, setConfigStatus] = useState<{
    isRealProduction: boolean;
    supabaseUrl: string;
    moneyfusionUrl: string;
    supabaseServiceKey: string;
    missingServerVars: string[];
  }>({
    isRealProduction: false,
    supabaseUrl: "Chargement...",
    moneyfusionUrl: "Chargement...",
    supabaseServiceKey: "Chargement...",
    missingServerVars: [],
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  // 1. Load Initial Configuration Status & Ebooks
  useEffect(() => {
    fetchConfigStatus();
    fetchEbooks();
  }, []);

  // PWA Service Worker Registration & Installation Prompt Handling
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered successfully, scope:", reg.scope);
        })
        .catch((err) => {
          console.error("[PWA] Service Worker registration failed:", err);
        });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("[PWA] beforeinstallprompt event captured!");
    };

    const handleAppInstalled = () => {
      console.log("[PWA] Application installed successfully!");
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Push Notifications Automatic Subscription Logic on User Login
  const subscribeUserToPush = async (userId: string) => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[Push] Notifications push are not supported on this device/browser");
      return;
    }

    try {
      console.log("[Push] Requesting notification permission...");
      const permission = await Notification.requestPermission();
      console.log("[Push] Notification permission:", permission);
      
      if (permission !== "granted") {
        console.log("[Push] Notification permission was denied");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      console.log("[Push] Service Worker is ready, subscribing...");
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          "BEWos_rKaxgZA8k1SfJvzf615UOpNy0EoohAbuiL1FrTFRsn4hO_7DiDs_cN3vfzeOwK7PfncMYQ2TwifvpSjlw"
        ),
      });

      console.log("[Push] User subscribed successfully to Push API:", subscription);

      if (hasSupabaseKeys && supabase) {
        // Query to check if subscription exists
        const { data: existing } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase.from("push_subscriptions").insert({
            user_id: userId,
            subscription: subscription.toJSON(),
          });
          if (error) {
            console.error("[Push] Error saving push subscription in DB:", error);
          } else {
            console.log("[Push] Push subscription saved in DB successfully");
          }
        } else {
          const { error } = await supabase
            .from("push_subscriptions")
            .update({ subscription: subscription.toJSON() })
            .eq("user_id", userId);
          if (error) {
            console.error("[Push] Error updating push subscription in DB:", error);
          } else {
            console.log("[Push] Push subscription updated in DB successfully");
          }
        }
      }
    } catch (err) {
      console.error("[Push] Failed to register user subscription:", err);
    }
  };

  // Trigger push registration when user is set
  useEffect(() => {
    if (user) {
      subscribeUserToPush(user.id);
    }
  }, [user]);

  // 2. Auth State Sync with real Supabase
  useEffect(() => {
    if (hasSupabaseKeys && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const userEmail = session.user.email || "";
          setUser({ id: session.user.id, email: userEmail });
          if (userEmail === "techsen237@gmail.com") {
            setRole("admin");
          } else {
            setRole("user");
          }
          fetchUserProfileAndData(session.user.id, session.access_token, userEmail);
        } else {
          setUser(null);
          setRole("user");
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const userEmail = session.user.email || "";
          setUser({ id: session.user.id, email: userEmail });
          if (userEmail === "techsen237@gmail.com") {
            setRole("admin");
          } else {
            setRole("user");
          }
          fetchUserProfileAndData(session.user.id, session.access_token, userEmail);
        } else {
          setUser(null);
          setRole("user");
          setPurchases([]);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [currentView]);

  const handleVerifyPaymentOnReturn = async (token: string) => {
    try {
      if (hasSupabaseKeys && supabase) {
        // Query achats
        const { data: purchase, error } = await supabase
          .from("achats")
          .select("*, ebook:ebooks(*)")
          .eq("token_pay", token)
          .maybeSingle();

        if (error || !purchase) return;

        let statusToSet = purchase.statut;

        if (purchase.statut === "pending") {
          try {
            const checkRes = await fetch(`https://www.pay.moneyfusion.net/paiementNotif/${token}`);
            const checkData = await checkRes.json();
            if (checkData.statut && checkData.data) {
              const externalStatus = checkData.data.statut; // pending, failure, no paid, paid
              if (externalStatus === "paid") {
                statusToSet = PaymentStatus.PAID;
              } else if (externalStatus === "failure" || externalStatus === "no paid") {
                statusToSet = PaymentStatus.FAILURE;
              }

              if (statusToSet !== purchase.statut) {
                await supabase
                  .from("achats")
                  .update({ statut: statusToSet })
                  .eq("token_pay", token);
              }
            }
          } catch (e) {
            console.error("Direct MoneyFusion poll failed:", e);
          }
        }

        if (statusToSet === PaymentStatus.PAID) {
          const ebookTitle = (purchase.ebook as any)?.titre || "Ebook";
          setSuccessNotification({
            show: true,
            message: `🎉 Félicitations ! Votre paiement pour l'ebook "${ebookTitle}" a été validé avec succès. Votre téléchargement est disponible !`,
          });
        } else if (statusToSet === PaymentStatus.FAILURE) {
          setSuccessNotification({
            show: true,
            message: "⚠️ Votre paiement a été annulé ou n'a pas pu être validé. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support.",
          });
        } else {
          setSuccessNotification({
            show: true,
            message: "⏳ Votre paiement est en cours de validation par MoneyFusion (Statut : En attente). Vos ebooks seront débloqués automatiquement d'ici quelques instants. Vous pouvez rafraîchir le statut manuellement si nécessaire.",
          });
        }

        const session = (await supabase.auth.getSession()).data.session;
        if (session?.user) {
          fetchUserProfileAndData(session.user.id, session.access_token, session.user.email);
        }
        return;
      }

      // Fallback
      const res = await fetch(`${API_BASE_URL}/api/payments/status/${token}`);
      if (res.ok) {
        const updatedPurchase = await res.json();
        if (updatedPurchase.statut === "paid") {
          setSuccessNotification({
            show: true,
            message: `🎉 Félicitations ! Votre paiement pour l'ebook "${updatedPurchase.ebook?.titre || "acheté"}" a été validé avec succès. Votre téléchargement est disponible !`,
          });
        } else if (updatedPurchase.statut === "failure") {
          setSuccessNotification({
            show: true,
            message: "⚠️ Votre paiement a été annulé ou n'a pas pu être validé. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support.",
          });
        } else {
          setSuccessNotification({
            show: true,
            message: "⏳ Votre paiement est en cours de validation par MoneyFusion (Statut : En attente). Vos ebooks seront débloqués automatiquement d'ici quelques instants. Vous pouvez rafraîchir le statut manuellement si nécessaire.",
          });
        }
      } else {
        setSuccessNotification({
          show: true,
          message: "🎉 Félicitations ! Votre paiement a été initié avec succès. Vos ebooks achetés apparaîtront dans votre espace ci-dessous après validation de la transaction.",
        });
      }
    } catch (err) {
      console.error("Error verifying payment on return:", err);
      setSuccessNotification({
        show: true,
        message: "🎉 Félicitations ! Votre paiement a été initié avec succès. Vos ebooks achetés apparaîtront dans votre espace ci-dessous après validation de la transaction.",
      });
    } finally {
      setView("my-purchases");
      // Refresh user purchases
      if (user && supabase) {
        const session = (await supabase.auth.getSession()).data.session;
        if (session) {
          fetchUserProfileAndData(user.id, session.access_token, user.email);
        }
      }
    }
  };

  // 2b. Detect affiliate links and handle click tracking / parrain tracking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    const parrainCode = params.get("parrain");

    if (parrainCode) {
      localStorage.setItem("ebookstore_parrain", parrainCode);
      console.log("[Affiliate] Parrain code saved:", parrainCode);
    }

    if (refCode && hasSupabaseKeys && supabase) {
      localStorage.setItem("ebookstore_ref", refCode);
      
      const registerClick = async () => {
        try {
          const { data: affiliateRow } = await supabase
            .from("affiliates")
            .select("id")
            .eq("referral_code", refCode)
            .maybeSingle();

          if (affiliateRow) {
            // Check if there is an ebook ID in the URL path
            const match = window.location.pathname.match(/^\/ebook\/([a-zA-Z0-9-]+)/);
            const ebookId = match ? match[1] : null;

            // Log click
            const { error: clickErr } = await supabase.from("affiliate_clicks").insert({
              affiliate_id: affiliateRow.id,
              ebook_id: ebookId,
              converted: false,
            });

            if (clickErr) {
              console.error("[Affiliate] Error inserting click:", clickErr);
            } else {
              console.log("[Affiliate] Click tracked successfully for:", refCode);
            }
          }
        } catch (e) {
          console.error("[Affiliate] Error in click tracking:", e);
        }
      };

      registerClick();
    }
  }, []);

  // 3. Detect and handle URL query param ?payment=success from MoneyFusion return_url
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      // Clean up URL parameter to avoid repetitive triggers on page reloads
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, "", cleanUrl);

      // Check for saved pending token in local storage
      const pendingToken = localStorage.getItem("pending_payment_token");
      if (pendingToken) {
        localStorage.removeItem("pending_payment_token");
        handleVerifyPaymentOnReturn(pendingToken);
      } else {
        // Fallback message if token is missing from localStorage
        setSuccessNotification({
          show: true,
          message: "🎉 Félicitations ! Votre paiement a été enregistré par MoneyFusion. Vos ebooks achetés apparaîtront dans votre espace ci-dessous dès réception de la notification de paiement.",
        });
        setView("my-purchases");
      }
    }
  }, [user]);

  // 4. Router-like deep linking and browser history synchronization for /ebook/{id}
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/^\/ebook\/([a-zA-Z0-9-]+)/);
      if (match && ebooks.length > 0) {
        const ebookId = match[1];
        const found = ebooks.find((b) => b.id === ebookId);
        if (found) {
          setSelectedEbook(found);
        } else {
          setSelectedEbook(null);
        }
      } else {
        setSelectedEbook(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [ebooks]);

  // Handle initial deep link load once ebooks are fetched
  useEffect(() => {
    const match = window.location.pathname.match(/^\/ebook\/([a-zA-Z0-9-]+)/);
    if (match && ebooks.length > 0) {
      const ebookId = match[1];
      const found = ebooks.find((b) => b.id === ebookId);
      if (found) {
        setSelectedEbook(found);
      }
    }
  }, [ebooks]);

  // Synchronize browser URL bar with selectedEbook changes
  useEffect(() => {
    const match = window.location.pathname.match(/^\/ebook\/([a-zA-Z0-9-]+)/);
    const currentUrlId = match ? match[1] : null;

    if (selectedEbook) {
      if (currentUrlId !== selectedEbook.id) {
        window.history.pushState(null, "", `/ebook/${selectedEbook.id}`);
      }
    } else {
      if (window.location.pathname.startsWith("/ebook/")) {
        window.history.pushState(null, "", "/");
      }
    }
  }, [selectedEbook]);

  const fetchConfigStatus = async () => {
    setLoadingConfig(true);
    try {
      const missingKeys: string[] = [];
      if (!hasSupabaseKeys) {
        missingKeys.push("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY");
      }
      setConfigStatus({
        isRealProduction: true,
        supabaseUrl: (import.meta as any).env.VITE_SUPABASE_URL || "Non définie",
        moneyfusionUrl: "https://pay.moneyfusion.net/Ebook_Store/22ec28c721674824/pay/",
        supabaseServiceKey: "Configurée",
        missingServerVars: missingKeys,
      });
    } catch (err) {
      console.error("Failed to fetch config status:", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchEbooks = async () => {
    setLoadingEbooks(true);
    setDbError(null);
    try {
      if (hasSupabaseKeys && supabase) {
        const { data, error } = await supabase
          .from("ebooks")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setEbooks(data || []);
      } else {
        const res = await fetch(`${API_BASE_URL}/api/ebooks`);
        if (res.ok) {
          const data = await res.json();
          setEbooks(data);
        } else {
          const errData = await res.json();
          setDbError(errData.error || "Une erreur est survenue lors de la récupération des ebooks.");
        }
      }
    } catch (err: any) {
      console.error("Error loading ebooks:", err);
      setDbError(err.message || "Erreur réseau de communication avec le serveur.");
    } finally {
      setLoadingEbooks(false);
    }
  };

  const fetchUserAffiliate = async (userId: string) => {
    if (!hasSupabaseKeys || !supabase) return;
    setLoadingAffiliate(true);
    try {
      const { data, error } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error) {
        setUserAffiliate(data);
      }
    } catch (err) {
      console.error("Error fetching user affiliate status:", err);
    } finally {
      setLoadingAffiliate(false);
    }
  };

  // Fetch real User Profile and Purchases via backend
  const fetchUserProfileAndData = async (userId: string, token: string, userEmail?: string) => {
    try {
      if (hasSupabaseKeys && supabase) {
        fetchUserAffiliate(userId);

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        const emailToCheck = userEmail || "";
        if (emailToCheck === "techsen237@gmail.com" || profile?.role === "admin") {
          setRole("admin");
        } else {
          setRole("user");
        }

        const { data: purchasesData, error: purchasesErr } = await supabase
          .from("achats")
          .select("*, ebook:ebooks(*)")
          .eq("user_id", userId);

        if (purchasesData) {
          setPurchases(purchasesData as any);
        }
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/user-data`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const emailToCheck = userEmail || data.user?.email || "";
        if (emailToCheck === "techsen237@gmail.com" || data.role === "admin") {
          setRole("admin");
        } else {
          setRole("user");
        }
        setPurchases(data.purchases);
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  };

  // Admin: Add Ebook
  const handleAddEbook = async (ebookData: Omit<Ebook, "id">): Promise<{ success: boolean; error?: string }> => {
    try {
      if (hasSupabaseKeys && supabase) {
        const { data, error } = await supabase
          .from("ebooks")
          .insert([ebookData])
          .select();
        if (error) {
          console.error("Supabase insert error:", error);
          return { success: false, error: error.message };
        }
        await fetchEbooks();
        return { success: true };
      }

      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session ? `Bearer ${session.access_token}` : "";

      const res = await fetch(`${API_BASE_URL}/api/ebooks`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify(ebookData),
      });

      if (res.ok) {
        await fetchEbooks();
        return { success: true };
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Failed to add ebook from server:", errData);
        return { success: false, error: errData.error || "Une erreur inconnue est survenue côté serveur." };
      }
    } catch (err: any) {
      console.error("Failed to add ebook:", err);
      return { success: false, error: err.message || "Erreur de connexion avec le serveur." };
    }
  };

  // Admin: Delete Ebook
  const handleDeleteEbook = async (id: string): Promise<boolean> => {
    try {
      if (hasSupabaseKeys && supabase) {
        const { error } = await supabase
          .from("ebooks")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Supabase delete error:", error);
          return false;
        }
        await fetchEbooks();
        return true;
      }

      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session ? `Bearer ${session.access_token}` : "";

      const res = await fetch(`${API_BASE_URL}/api/ebooks/` + id, {
        method: "DELETE",
        headers: {
          "Authorization": token
        }
      });
      if (res.ok) {
        await fetchEbooks();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete ebook:", err);
      return false;
    }
  };

  // Auth Success Handler
  const handleLoginSuccess = (userData: { id: string; email: string }, userRole: string) => {
    setUser(userData);
    setRole(userRole);
    setAuthModalOpen(false);
  };

  // Logout Handler
  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setRole("user");
    setPurchases([]);
    setUserAffiliate(null);
    setView("catalog");
  };

  // Initiate MoneyFusion Payment Flow
  const handleOpenCheckout = async (ebook: Ebook) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (ebook.prix === 0) {
      setIsPurchasing(true);
      try {
        if (hasSupabaseKeys && supabase) {
          const tokenPay = "free_" + Math.random().toString(36).substr(2, 14);

          // Check for affiliate referral code in localStorage
          let affiliateIdToInsert: string | null = null;
          const savedRefCode = localStorage.getItem("ebookstore_ref");
          if (savedRefCode) {
            try {
              const { data: affiliateRow } = await supabase
                .from("affiliates")
                .select("id")
                .eq("referral_code", savedRefCode)
                .maybeSingle();
              if (affiliateRow) {
                affiliateIdToInsert = affiliateRow.id;
              }
            } catch (e) {
              console.error("Error matching affiliate referral code:", e);
            }
          }

          // Insert transaction directly into Supabase
          const { error: insertErr } = await supabase.from("achats").insert([
            {
              user_id: user.id,
              ebook_id: ebook.id,
              token_pay: tokenPay,
              statut: "paid",
              montant: 0,
              affiliate_id: affiliateIdToInsert,
            }
          ]);

          if (insertErr) {
            throw new Error("Impossible d'ajouter l'ebook gratuit à votre compte : " + insertErr.message);
          }

          // Refresh purchases data
          const session = (await supabase.auth.getSession()).data.session;
          if (session) {
            await fetchUserProfileAndData(user.id, session.access_token, user.email);
          }

          alert(`🎉 L'ebook gratuit "${ebook.titre}" a été ajouté avec succès à votre bibliothèque ! Vous pouvez le télécharger dès maintenant.`);
          setSelectedEbook(null);
          return;
        }

        // Fallback flow
        let authToken = "";
        if (supabase) {
          const session = (await supabase.auth.getSession()).data.session;
          authToken = session?.access_token || "";
        }

        const payload = {
          ebookId: ebook.id,
          userId: user.id,
          numeroSend: "FREE",
          nomclient: user.email.split("@")[0] || "Client",
          userEmail: user.email,
          montant: 0,
          statut: "paid",
        };

        const res = await fetch(`${API_BASE_URL}/api/payments/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          if (supabase) {
            const session = (await supabase.auth.getSession()).data.session;
            if (session) await fetchUserProfileAndData(user.id, session.access_token, user.email);
          }
          alert(`🎉 L'ebook gratuit "${ebook.titre}" a été ajouté avec succès à votre bibliothèque ! Vous pouvez le télécharger dès maintenant.`);
          setSelectedEbook(null);
        } else {
          const errData = await res.json();
          alert(errData.error || "Impossible d'obtenir l'ebook gratuit.");
        }
      } catch (err: any) {
        alert("Une erreur s'est produite : " + err.message);
      } finally {
        setIsPurchasing(false);
      }
      return;
    }

    setCheckoutEbook(ebook);
    setPhoneInput("");
    setCountryCode("+237");
    setClientNameInput(user?.email.split("@")[0] || "Client");
    setPurchaseError(null);
    setCheckoutModalOpen(true);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutEbook || !user) return;

    setIsPurchasing(true);
    setPurchaseError(null);

    const cleanCountryCode = countryCode.replace(/^\+/, "");
    let cleanPhone = phoneInput.trim().replace(/\s+/g, "").replace(/^\+/, "").replace(/^00/, "");
    if (cleanPhone.startsWith(cleanCountryCode)) {
      cleanPhone = cleanPhone.substring(cleanCountryCode.length);
    }
    const formattedPhone = cleanCountryCode + cleanPhone;

    try {
      if (hasSupabaseKeys && supabase) {
        // 1. Generate local identifiers
        const orderId = "order_" + Math.random().toString(36).substr(2, 9);
        const tokenPay = "mf_tok_" + Math.random().toString(36).substr(2, 14);

        // Check for affiliate referral code in localStorage
        let affiliateIdToInsert: string | null = null;
        const savedRefCode = localStorage.getItem("ebookstore_ref");
        if (savedRefCode) {
          try {
            const { data: affiliateRow } = await supabase
              .from("affiliates")
              .select("id")
              .eq("referral_code", savedRefCode)
              .maybeSingle();
            if (affiliateRow) {
              affiliateIdToInsert = affiliateRow.id;
            }
          } catch (e) {
            console.error("Error matching affiliate referral code:", e);
          }
        }

        // 2. Insert transaction directly into Supabase
        const { error: insertErr } = await supabase.from("achats").insert([
          {
            user_id: user.id,
            ebook_id: checkoutEbook.id,
            token_pay: tokenPay,
            statut: "pending",
            montant: Number(checkoutEbook.prix),
            affiliate_id: affiliateIdToInsert,
          }
        ]);

        if (insertErr) {
          throw new Error("Impossible de créer la transaction dans la base de données : " + insertErr.message);
        }

        // 3. Build MoneyFusion payload as specified in documentation
        const payload = {
          totalPrice: Number(checkoutEbook.prix),
          article: [{ [checkoutEbook.titre]: Number(checkoutEbook.prix) }],
          personal_Info: [{ userId: user.id, orderId, ebookId: checkoutEbook.id }],
          numeroSend: formattedPhone,
          nomclient: clientNameInput,
          return_url: "https://ebookstore-73b.pages.dev/?payment=success",
          webhook_url: "https://ebookstore-73b.pages.dev/api/webhook/moneyfusion", // mock webhook
        };

        // 4. Call MoneyFusion API directly
        const moneyfusionUrl = "https://pay.moneyfusion.net/Ebook_Store/22ec28c721674824/pay/";
        console.log("Calling MoneyFusion payment creation endpoint directly from client:", payload);
        const response = await fetch(moneyfusionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log("MoneyFusion Direct API Response:", data);

        if (data.statut) {
          const returnedToken = data.token || tokenPay;
          if (returnedToken !== tokenPay) {
            await supabase
              .from("achats")
              .update({ token_pay: returnedToken })
              .eq("token_pay", tokenPay);
          }

          setCheckoutModalOpen(false);
          setSelectedEbook(null);
          localStorage.setItem("pending_payment_token", returnedToken);
          window.location.href = data.url; // Redirect to MoneyFusion Checkout
        } else {
          setPurchaseError(data.message || "Échec de l'initialisation du paiement MoneyFusion.");
        }
        return;
      }

      // Fallback code
      let authToken = "";
      if (supabase) {
        const session = (await supabase.auth.getSession()).data.session;
        authToken = session?.access_token || "";
      }

      const payload = {
        ebookId: checkoutEbook.id,
        userId: user.id,
        numeroSend: formattedPhone,
        nomclient: clientNameInput,
        userEmail: user.email,
      };

      const res = await fetch(`${API_BASE_URL}/api/payments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.statut) {
        setCheckoutModalOpen(false);
        setSelectedEbook(null);
        if (data.token) {
          localStorage.setItem("pending_payment_token", data.token);
        }
        window.location.href = data.url;
      } else {
        setPurchaseError(data.error || "Une erreur s'est produite lors de l'initialisation du paiement MoneyFusion.");
      }
    } catch (err: any) {
      setPurchaseError("Erreur réseau ou base de données : " + err.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Secure Signed Downloader Trigger
  const handleDownloadEbook = async (ebookId: string) => {
    setDownloadingId(ebookId);
    try {
      // Prioritize the secure backend endpoint which uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS
      let authToken = "";
      if (supabase) {
        const session = (await supabase.auth.getSession()).data.session;
        authToken = session?.access_token || "";
      }

      console.log(`[DOWNLOAD] Tentative de récupération du lien via le backend pour l'ebook: ${ebookId}`);
      const res = await fetch(`${API_BASE_URL}/api/download/${ebookId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const link = document.createElement("a");
        link.href = data.url;
        link.download = data.filename || "ebook.pdf";
        link.target = "_blank";
        link.referrerPolicy = "no-referrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Fallback: If backend is not available or returned an error, and we have direct Supabase keys, try client-side direct access
      if (hasSupabaseKeys && supabase) {
        console.warn("[DOWNLOAD] Échec ou indisponibilité du backend. Essai de génération directe client-side...");
        const session = (await supabase.auth.getSession()).data.session;
        if (!session?.user) {
          alert("Veuillez vous connecter pour télécharger cet ebook.");
          return;
        }

        // 1. Check purchase
        const { data: purchase, error: purchaseErr } = await supabase
          .from("achats")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("ebook_id", ebookId)
          .eq("statut", "paid")
          .maybeSingle();

        if (purchaseErr || !purchase) {
          alert("Vous n'avez pas acheté cet ebook ou le paiement est toujours en cours.");
          return;
        }

        // 2. Get ebook storage path
        const { data: ebook, error: ebookErr } = await supabase
          .from("ebooks")
          .select("url_fichier_storage")
          .eq("id", ebookId)
          .single();

        if (ebookErr || !ebook || !ebook.url_fichier_storage) {
          alert("Fichier d'ebook non trouvé sur notre serveur.");
          return;
        }

        // 3. Generate signed URL directly from client
        const { data: signedUrlData, error: storageErr } = await supabase.storage
          .from("ebooks-fichiers")
          .createSignedUrl(ebook.url_fichier_storage, 60);

        if (storageErr || !signedUrlData) {
          throw storageErr || new Error("Échec de la génération du lien sécurisé.");
        }

        const link = document.createElement("a");
        link.href = signedUrlData.signedUrl;
        link.download = ebook.url_fichier_storage;
        link.target = "_blank";
        link.referrerPolicy = "no-referrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // If the backend failed and we had no client-side direct fallback
      const errData = await res.json().catch(() => ({}));
      alert(errData.error || "Impossible de générer le lien de téléchargement sécurisé.");
    } catch (err: any) {
      alert("Erreur lors de la génération de l'URL sécurisée : " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // Manual Check Status for Webhook Synchronization
  const handleRefreshPurchaseStatus = async (token: string) => {
    try {
      if (hasSupabaseKeys && supabase) {
        const { data: purchase, error } = await supabase
          .from("achats")
          .select("*, ebook:ebooks(*)")
          .eq("token_pay", token)
          .maybeSingle();

        if (error || !purchase) {
          alert("Impossible de trouver la transaction correspondante.");
          return;
        }

        let statusToSet = purchase.statut;

        if (purchase.statut === "pending") {
          try {
            const checkRes = await fetch(`https://www.pay.moneyfusion.net/paiementNotif/${token}`);
            const checkData = await checkRes.json();
            if (checkData.statut && checkData.data) {
              const externalStatus = checkData.data.statut;
              if (externalStatus === "paid") {
                statusToSet = PaymentStatus.PAID;
              } else if (externalStatus === "failure" || externalStatus === "no paid") {
                statusToSet = PaymentStatus.FAILURE;
              }

              if (statusToSet !== purchase.statut) {
                await supabase
                  .from("achats")
                  .update({ statut: statusToSet })
                  .eq("token_pay", token);
              }
            }
          } catch (e) {
            console.error("Direct MoneyFusion status poll failed:", e);
          }
        }

        const session = (await supabase.auth.getSession()).data.session;
        if (session) {
          fetchUserProfileAndData(user!.id, session.access_token);
        }

        if (statusToSet === PaymentStatus.PAID) {
          alert(`🎉 Paiement validé avec succès pour l'ebook "${(purchase.ebook as any)?.titre || 'acheté'}" ! Votre fichier PDF est débloqué.`);
        } else if (statusToSet === PaymentStatus.FAILURE) {
          alert("❌ Le paiement semble avoir été annulé ou a échoué.");
        } else {
          alert("⏳ Le paiement est toujours en cours de validation chez MoneyFusion. Veuillez patienter un instant puis réessayer.");
        }
        return;
      }

      // Fallback
      const res = await fetch(`${API_BASE_URL}/api/payments/status/${token}`);
      if (res.ok) {
        const updatedPurchase = await res.json();

        // Refresh list
        if (supabase) {
          const session = (await supabase.auth.getSession()).data.session;
          if (session) fetchUserProfileAndData(user!.id, session.access_token);
        }

        if (updatedPurchase.statut === PaymentStatus.PAID) {
          alert(`🎉 Paiement validé avec succès pour l'ebook "${updatedPurchase.ebook?.titre}" ! Votre fichier PDF est débloqué.`);
        } else if (updatedPurchase.statut === PaymentStatus.FAILURE) {
          alert("❌ Le paiement semble avoir été annulé ou a échoué.");
        } else {
          alert("⏳ Le paiement est toujours en cours de validation chez MoneyFusion. Veuillez patienter un instant puis réessayer.");
        }
      }
    } catch (err) {
      console.error("Error checking status:", err);
    }
  };

  // Determine if there are missing environment variables
  const missingClientVars: string[] = [];
  const clientSupUrl = (import.meta as any).env.VITE_SUPABASE_URL;
  const clientSupKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

  if (!clientSupUrl) missingClientVars.push("VITE_SUPABASE_URL (Client)");
  if (!clientSupKey) missingClientVars.push("VITE_SUPABASE_ANON_KEY (Client)");

  const isConfigError = missingClientVars.length > 0 || configStatus.missingServerVars?.length > 0;

  // ==========================================
  // CONFIGURATION ERROR RENDER INTERFACE (FAIL-CLOSED)
  // ==========================================
  if (isConfigError && !loadingConfig) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans select-none">
        <div className="max-w-xl w-full bg-slate-950/80 border border-red-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-8 animate-in fade-in duration-500">
          
          {/* Accent decoration */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-red-600/10 blur-3xl rounded-full"></div>
          
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
            <div className="p-3.5 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight text-white leading-none">
                Erreur de Configuration
              </h1>
              <p className="text-xs text-red-400 mt-1.5 font-medium">Production Uniquement - Mode Simulateur Désactivé</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pour des raisons de sécurité, cette boutique d'ebooks fonctionne exclusivement en mode réel avec de vraies clés. Le système a détecté des variables d'environnement manquantes qui empêchent son démarrage.
            </p>

            {/* Error Message Details */}
            <div className="space-y-3.5 pt-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Variables d'environnement requises manquantes :
              </span>
              
              <div className="space-y-2.5">
                {/* Client keys check */}
                {missingClientVars.map((v) => (
                  <div key={v} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3 text-xs text-red-300 font-mono">
                    <KeyRound className="h-4 w-4 shrink-0 text-red-500" />
                    <span>Configuration manquante : {v} n'est pas définie</span>
                  </div>
                ))}

                {/* Server keys check */}
                {configStatus.missingServerVars?.map((v) => (
                  <div key={v} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3 text-xs text-red-300 font-mono">
                    <KeyRound className="h-4 w-4 shrink-0 text-red-500" />
                    <span>Configuration manquante : {v} n'est pas définie</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Guidelines on how to fix */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-2 text-xs text-slate-400 leading-relaxed">
            <p className="font-bold text-slate-200">Comment résoudre ce problème ?</p>
            <p>
              Veuillez définir l'ensemble de ces clés dans votre panneau de configuration d'hébergement ou votre fichier d'environnement local. Les variables attendues sont détaillées dans le fichier <code className="text-indigo-400 font-mono">.env.example</code>.
            </p>
          </div>

          {/* Retry Button */}
          <button
            onClick={() => {
              fetchConfigStatus();
              fetchEbooks();
            }}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Vérifier à nouveau</span>
          </button>
        </div>
      </div>
    );
  }

  // Categories list
  const categories = ["all", ...new Set(ebooks.map((eb) => eb.categorie))].filter((cat) => cat !== "all") as string[];

  // Filtering catalogue
  const filteredEbooks = ebooks.filter((eb) => {
    const matchesSearch =
      eb.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eb.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eb.categorie.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || eb.categorie === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-between" id="app-root">
      {/* Navigation Header */}
      <Header
        currentView={currentView}
        setView={setView}
        user={user}
        role={role}
        userAffiliate={userAffiliate}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {deferredPrompt && !isAppInstalled && (
          <div className="mb-8 bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-150 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300" id="pwa-install-banner">
            <div className="flex items-center gap-3.5 text-left w-full">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
                <Download className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-xs sm:text-sm text-indigo-950">Télécharger l'application EbookStore</h4>
                <p className="text-[11px] sm:text-xs text-indigo-800 leading-relaxed font-sans">
                  Installez l'application sur votre écran d'accueil pour un accès instantané et un confort de lecture optimal.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                onClick={() => setDeferredPrompt(null)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
              >
                Plus tard
              </button>
              <button
                onClick={async () => {
                  if (!deferredPrompt) return;
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  console.log(`User prompt response: ${outcome}`);
                  setDeferredPrompt(null);
                }}
                className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow text-center flex items-center justify-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Installer</span>
              </button>
            </div>
          </div>
        )}

        {successNotification && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 relative" id="payment-success-notification">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-1 flex-1 pr-8">
              <h4 className="font-display font-bold text-xs sm:text-sm text-emerald-950">Confirmation de commande</h4>
              <p className="text-xs text-emerald-800 leading-relaxed font-sans">{successNotification.message}</p>
            </div>
            <button
              onClick={() => setSuccessNotification(null)}
              className="absolute top-4 right-4 text-emerald-400 hover:text-emerald-700 font-bold text-xs"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* HOME VIEW */}
        {currentView === "home" && (
          <div className="space-y-8" id="home-view">
            {/* Hero / Banner section */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-indigo-950/30 relative overflow-hidden flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="space-y-4 max-w-xl text-center sm:text-left relative z-10">
                <span className="bg-indigo-500/10 backdrop-blur-md text-indigo-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-500/20 font-mono">
                  🚀 NOURRISSEZ VOTRE INTELLIGENCE
                </span>
                <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-none">
                  Les Meilleurs Ebooks de Développement en Afrique
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                  Téléchargement de PDF haute-qualité sécurisé et automatisé. Payez instantanément par <strong>Orange Money, MTN MoMo, Moov ou Wave</strong>.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setView("catalog")}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-all duration-150 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Explorer le Catalogue</span>
                    <ShoppingBag className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Vector Icon graphic on the right */}
              <div className="shrink-0 p-4 bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 rounded-2xl hidden lg:block rotate-3 hover:rotate-0 transition-transform duration-300">
                <ShoppingBag className="h-16 w-16 text-indigo-400" />
              </div>
            </div>

            {/* Highlighted Ebooks Section */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-150 pb-3">
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900 tracking-tight">
                    Ebooks à la une 🌟
                  </h3>
                  <p className="text-xs text-slate-500">Découvrez une sélection de nos meilleurs ouvrages récents</p>
                </div>
                <button
                  onClick={() => setView("catalog")}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all duration-150 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  Voir tout le catalogue &rarr;
                </button>
              </div>

              {loadingEbooks ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="h-6 w-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : ebooks.length === 0 ? (
                <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
                  <p className="text-sm text-slate-500">Aucun ebook disponible pour le moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                  {ebooks.slice(0, 3).map((ebook) => {
                    const hasPurchased = purchases.some(
                      (p) => p.ebook_id === ebook.id && p.statut === PaymentStatus.PAID
                    );
                    return (
                      <EbookCard
                        key={ebook.id}
                        ebook={ebook}
                        onSelect={setSelectedEbook}
                        onBuy={handleOpenCheckout}
                        hasPurchased={hasPurchased}
                        isPurchasing={isPurchasing}
                        user={user}
                        onOpenAuth={() => setAuthModalOpen(true)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* About / Presentation Section */}
            <AboutSection 
              onJoinAffiliate={() => setView("affiliate")} 
              user={user} 
            />
          </div>
        )}

        {/* CATALOG VIEW */}
        {currentView === "catalog" && (
          <div className="space-y-8" id="catalog-view">
            {/* Catalog Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <h3 className="font-display font-bold text-lg text-slate-900 tracking-tight">
                  Toutes nos oeuvres disponibles ({filteredEbooks.length})
                </h3>
              </div>

              {dbError ? (
                <div className="bg-rose-50 border border-rose-150 rounded-2xl p-6 text-center space-y-4 max-w-lg mx-auto">
                  <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-base text-slate-900">Impossible de charger le catalogue d'ebooks</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Une erreur est survenue lors de l'accès aux données. Veuillez actualiser la page ou contacter le support.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchEbooks()}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 shadow"
                  >
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "3s" }} />
                    <span>Réessayer la connexion</span>
                  </button>
                </div>
              ) : loadingEbooks ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                  <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-500 font-mono">Interrogation de la base de données...</span>
                </div>
              ) : filteredEbooks.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                  <p className="text-sm text-slate-500">Aucun ebook ne correspond à votre recherche ou catégorie.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                  {filteredEbooks.map((ebook) => {
                    const hasPurchased = purchases.some(
                      (p) => p.ebook_id === ebook.id && p.statut === PaymentStatus.PAID
                    );
                    return (
                      <EbookCard
                        key={ebook.id}
                        ebook={ebook}
                        onSelect={setSelectedEbook}
                        onBuy={handleOpenCheckout}
                        hasPurchased={hasPurchased}
                        isPurchasing={isPurchasing}
                        user={user}
                        onOpenAuth={() => setAuthModalOpen(true)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MY PURCHASES VIEW */}
        {currentView === "my-purchases" && (
          <PurchaseList
            purchases={purchases}
            onDownload={handleDownloadEbook}
            downloadingId={downloadingId}
            onRefreshStatus={handleRefreshPurchaseStatus}
            setView={setView}
          />
        )}

        {/* ADMIN BACK-OFFICE VIEW */}
        {currentView === "admin" && (
          role === "admin" ? (
            <AdminPanel
              ebooks={ebooks}
              onAddEbook={handleAddEbook}
              onDeleteEbook={handleDeleteEbook}
              configStatus={configStatus}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg mx-auto text-center space-y-6 shadow-sm my-12" id="access-denied-view">
              <div className="h-14 w-14 bg-rose-50 text-rose-650 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
                <Shield className="h-8 w-8 text-rose-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">Accès Refusé</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Cette section d'administration est strictement réservée au gérant de la boutique. Veuillez vous connecter avec votre compte administrateur habilité.
                </p>
              </div>
              <button
                onClick={() => setView("catalog")}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Retourner au Catalogue
              </button>
            </div>
          )
        )}

        {/* AFFILIATE PORTAL VIEW */}
        {currentView === "affiliate" && (
          <AffiliatePortal
            user={user}
            userAffiliate={userAffiliate}
            onRefreshAffiliate={fetchUserAffiliate}
            onOpenAuth={() => setAuthModalOpen(true)}
            ebooks={ebooks}
            purchases={purchases}
          />
        )}

        {/* PRIVACY POLICY VIEW */}
        {currentView === "politique-de-confidentialite" && (
          <PolitiqueConfidentialite setView={setView} />
        )}

        {/* CGU / CGV VIEW */}
        {currentView === "conditions-generales" && (
          <ConditionsGenerales setView={setView} />
        )}

        {/* MENTIONS LEGALES VIEW */}
        {currentView === "mentions-legales" && (
          <MentionsLegales setView={setView} />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-400 font-mono tracking-wide mt-12 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Top of footer with legal links */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 pb-6 gap-4">
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-slate-800 text-sm">
                EbookStore<span className="text-indigo-600">Afrique</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center sm:justify-end text-[11px] font-semibold text-slate-500">
              <button
                onClick={() => setView("politique-de-confidentialite")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Confidentialité
              </button>
              <button
                onClick={() => setView("conditions-generales")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                CGU & CGV
              </button>
              <button
                onClick={() => setView("mentions-legales")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Mentions Légales
              </button>
            </div>
          </div>

          {/* Bottom of footer with copyrights and protection */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
            <span>&copy; 2026 EbookStore Afrique. Tous droits réservés.</span>
            <div className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-indigo-600" />
              <span>Sécurisé par Supabase & Cloudflare</span>
            </div>
          </div>
        </div>
      </footer>

      {/* --- MODALS --- */}

      {/* 1. Auth Login/Register Modal */}
      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* 2. Book Detailed Preview Modal */}
      {selectedEbook && (
        <BookDetailModal
          ebook={selectedEbook}
          onClose={() => setSelectedEbook(null)}
          onBuy={handleOpenCheckout}
          hasPurchased={purchases.some(
            (p) => p.ebook_id === selectedEbook.id && p.statut === PaymentStatus.PAID
          )}
          isPurchasing={isPurchasing}
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
          onDownload={handleDownloadEbook}
          downloadingId={downloadingId}
        />
      )}

      {/* 3. Checkout Information Input Modal */}
      {checkoutModalOpen && checkoutEbook && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans" id="checkout-input-modal">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCheckoutModalOpen(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative transform overflow-hidden rounded-2xl bg-white p-6 sm:p-8 text-left shadow-2xl transition-all w-full max-w-sm border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center space-y-1">
                <h3 className="font-display font-black text-lg text-slate-900">Coordonnées Mobile Money</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Saisissez les informations de facturation pour lancer la demande de paiement MoneyFusion.
                </p>
              </div>

              {purchaseError && (
                <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-100 font-mono">
                  {purchaseError}
                </div>
              )}

              <form onSubmit={handleCreatePayment} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">
                    Nom Complet du Client
                  </label>
                  <input
                    type="text"
                    required
                    value={clientNameInput}
                    onChange={(e) => setClientNameInput(e.target.value)}
                    placeholder="Ex: John Doe"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">
                    Numéro de Téléphone Payeur *
                  </label>
                  <div className="flex gap-2 items-center">
                    <div className="w-2/5 min-w-[130px]">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-full h-10 px-2 text-[11px] sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans font-semibold text-slate-850 cursor-pointer"
                      >
                        <optgroup label="CEMAC">
                          <option value="+237">🇨🇲 Cameroun (+237)</option>
                          <option value="+241">🇬🇦 Gabon (+241)</option>
                          <option value="+242">🇨🇬 Congo (+242)</option>
                          <option value="+235">🇹🇩 Tchad (+235)</option>
                          <option value="+236">🇨🇫 RCA (+236)</option>
                          <option value="+240">🇬🇶 Guinée Éq. (+240)</option>
                        </optgroup>
                        <optgroup label="CEDEAO">
                          <option value="+225">🇨🇮 Côte d'Ivoire (+225)</option>
                          <option value="+221">🇸🇳 Sénégal (+221)</option>
                          <option value="+228">🇹🇬 Togo (+228)</option>
                          <option value="+229">🇧🇯 Bénin (+229)</option>
                          <option value="+226">🇧🇫 Burkina Faso (+226)</option>
                          <option value="+223">🇲🇱 Mali (+223)</option>
                          <option value="+227">🇳🇪 Niger (+227)</option>
                          <option value="+224">🇬🇳 Guinée (+224)</option>
                          <option value="+245">🇬🇼 Guinée-Bissau (+245)</option>
                          <option value="+233">🇬🇭 Ghana (+233)</option>
                          <option value="+234">🇳🇬 Nigéria (+234)</option>
                          <option value="+231">🇱🇷 Libéria (+231)</option>
                          <option value="+232">🇸🇱 Sierra Leone (+232)</option>
                          <option value="+220">🇬🇲 Gambie (+220)</option>
                          <option value="+238">🇨🇻 Cap-Vert (+238)</option>
                        </optgroup>
                      </select>
                    </div>
                    <div className="flex-1 relative flex items-center">
                      <Phone className="absolute left-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Ex: 699887766"
                        className="w-full pl-10 pr-4 py-2 h-10 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Numéro utilisé pour débiter votre mobile money (Orange, MTN, Wave).
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-600 flex justify-between items-center">
                  <span>Montant de la transaction :</span>
                  <strong className="font-bold text-slate-900">{checkoutEbook.prix.toLocaleString()} FCFA</strong>
                </div>

                <button
                  type="submit"
                  disabled={isPurchasing}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-100 disabled:text-slate-400 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow hover:shadow-md flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="h-4.5 w-4.5" />
                  <span>{isPurchasing ? "Lancement en cours..." : "Lancer le paiement"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
