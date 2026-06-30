import type { LegalConfig } from "@/lib/legal/config";
import type { HelpDocument } from "@/lib/help/types";

export function getHelpDocument(config: LegalConfig): HelpDocument {
  return {
    title: "Help Center",
    description:
      "Waitless guide to run your queue, manage customers, and configure your business.",
    categories: [
      {
        id: "getting-started",
        title: "Getting started",
        description: "Start using Waitless in minutes.",
        items: [
          {
            id: "what-is-waitless",
            question: "What is Waitless?",
            answer:
              "Waitless is a smart waitlist for physical businesses — clinics, restaurants, salons, and similar. Staff manage the queue in the admin panel; end customers track position and estimated wait time on their phone via a WhatsApp link, with no app install.",
          },
          {
            id: "onboarding",
            question: "How do I start after creating an account?",
            answer:
              "After signup or Google login, complete onboarding with your business name. Then open Queue in the panel, add your first customer, and send the link via WhatsApp. Configure branding, average service time, and team in Settings when ready.",
          },
          {
            id: "roles",
            question: "What are the team roles?",
            answer:
              "Owner — full control, team management, subscription, and business deletion. Admin — queue, customers, analytics, and operational settings. Base — queue, customers, and adding new customers to the queue. The sidebar only shows screens allowed for your role.",
          },
        ],
      },
      {
        id: "queue",
        title: "Queue operations",
        description: "Day-to-day at the front desk.",
        items: [
          {
            id: "add-customer",
            question: "How do I add a customer to the queue?",
            answer:
              "Use \"Add customer\" in the sidebar or the quick search at the top of Queue. Enter name and WhatsApp. The customer joins the Waiting column and gets a unique link to track position.",
          },
          {
            id: "kanban",
            question: "How does the Waiting / In Service kanban work?",
            answer:
              "Waiting lists customers in arrival order. Click Start to move them to In Service. Click Finish to record the visit in history; the customer sees \"Service completed\" on their screen before leaving.",
          },
          {
            id: "live-badge",
            question: "What does the Live badge mean?",
            answer:
              "It means the panel is synced in real time with Firestore. Queue changes (start, finish, dropouts) appear instantly for staff and for the customer on the queue link.",
          },
          {
            id: "whatsapp-link",
            question: "How do I send the queue link via WhatsApp?",
            answer:
              "On the customer card in Waiting, use the WhatsApp button. It opens a wa.me chat with a pre-filled message including the queue link. On Pro with WhatsApp Business API enabled, automated API sending is also available.",
          },
          {
            id: "tolerance",
            question: "What is tolerance?",
            answer:
              "When a customer is next in line, a countdown starts (configurable in Settings). If they don't show within that window, they may be removed automatically and the spot freed for reallocation. Available on the Pro plan only.",
          },
          {
            id: "spot-offer",
            question: "What is spot reallocation (Open spot)?",
            answer:
              "When someone drops out or misses tolerance, Waitless offers the spot sequentially to the next customers in line. The panel shows \"Open spot\" and the customer gets an alert on their link to accept or decline. Pro plan only.",
          },
        ],
      },
      {
        id: "client-experience",
        title: "Customer experience",
        description: "What happens on the /q/{token} link.",
        items: [
          {
            id: "client-screen",
            question: "What does the customer see on the queue link?",
            answer:
              "Queue position, estimated wait time (ETA), business name (plus logo and accent color on paid plans), and alerts when they're close to being served. Everything updates in real time, no login required.",
          },
          {
            id: "no-app",
            question: "Does the customer need an app or account?",
            answer:
              "No. Just open the WhatsApp link in the phone browser. The link is unique per queue entry.",
          },
          {
            id: "client-leave",
            question: "Can the customer leave the queue?",
            answer:
              "Yes. On the queue screen there's \"Leave queue\". They can optionally notify the business via WhatsApp when leaving.",
          },
        ],
      },
      {
        id: "mini-crm",
        title: "Mini-CRM",
        description: "History and re-entry.",
        items: [
          {
            id: "search",
            question: "How do I search for a customer?",
            answer:
              "On Queue, use the search bar by name or WhatsApp (300 ms debounce). On Customers, see all records sorted by last visit.",
          },
          {
            id: "customers-page",
            question: "What is the Customers page for?",
            answer:
              "Lists previously served customers with name, WhatsApp, and visit count. Use \"Join queue\" to re-add someone without retyping data.",
          },
          {
            id: "duplicate",
            question: "Can I add the same customer twice to the queue?",
            answer:
              "No. Waitless prevents duplicates — if the customer is already Waiting or In Service, you'll see a warning when trying to add them again.",
          },
        ],
      },
      {
        id: "branding",
        title: "Branding and settings",
        description: "White-label and operational parameters.",
        items: [
          {
            id: "white-label",
            question: "How do I customize the customer screen?",
            answer:
              "In Settings → Brand: business name, tagline, accent color (WCAG contrast validated), and logo by URL or upload. Preview shows how customers will see the queue.",
          },
          {
            id: "avg-time",
            question: "How does average time affect ETA?",
            answer:
              "Average service time (in minutes) multiplied by queue position produces the estimate shown to the customer. Adjust it to match your real operation.",
          },
          {
            id: "whatsapp-api",
            question: "What is WhatsApp Business API?",
            answer:
              "Optional Pro integration for sending messages via Meta's API, in addition to manual wa.me links. Requires credentials configured by the platform operator.",
          },
        ],
      },
      {
        id: "team",
        title: "Team",
        description: "Invites and permissions.",
        items: [
          {
            id: "invite",
            question: "How do I invite team members?",
            answer:
              "Only the Owner can invite in Settings → Team. Enter email and choose Admin or Base. The invitee opens /admin/invite/{id} to accept.",
          },
          {
            id: "permissions",
            question: "Who accesses analytics, settings, and account?",
            answer:
              "Analytics and Settings: Owner and Admin. Account (subscription, tax ID, deletion): Owner only. Queue and Customers: all roles.",
          },
        ],
      },
      {
        id: "billing",
        title: "Plans and billing",
        description: "Limits and subscription.",
        items: [
          {
            id: "plans",
            question: "What are the plans and limits?",
            answer:
              "14-day trial — up to 80 services/month and 2 users (read-only after trial without a paid plan). Essential — up to 600 services/month, 5 users, logo/accent, and basic analytics. Pro — unlimited services (3,000/month fair use), unlimited users, tolerance, spot reallocation, and full analytics.",
          },
          {
            id: "subscription",
            question: "Where do I manage my subscription?",
            answer:
              "The Owner opens Account in the panel to view the current plan, change subscription via Stripe, and manage payment. Other members don't see this screen.",
          },
          {
            id: "support-plans",
            question: "What's the support difference between plans?",
            answer:
              "All plans use the same email support channel. Contact details are in the Contact support section below.",
          },
        ],
      },
      {
        id: "security",
        title: "Security and privacy",
        description: "Account, 2FA, and data rights.",
        items: [
          {
            id: "2fa",
            question: "How do I enable two-factor authentication (2FA)?",
            answer:
              "In Security, enable email 2FA. On next logins, an OTP code is sent before accessing the panel. You can mark trusted devices to skip the code for 30 days.",
          },
          {
            id: "password",
            question: "Can I use password and Google on the same account?",
            answer:
              "Yes. In Security you see active login methods and can set or change password even if you previously signed in with Google.",
          },
          {
            id: "lgpd",
            question: "How do I exercise data rights (access, deletion, etc.)?",
            answer:
              `Personal data requests should go through the LGPD channel at ${config.productionUrl}/canal-lgpd or email ${config.lgpdEmail} with subject \"LGPD Request\". Response time: up to 15 days.`,
          },
        ],
      },
    ],
    contact: {
      title: "Contact support",
      paragraphs: [
        `Use the button below to open the support form. We automatically include your business name and account reference — you can also use \"Copy ref.\" on the Account page (Owner) if you need the identifier elsewhere.`,
        "For data subject rights (LGPD), use the LGPD channel — not operational support email.",
      ],
      emailLabel: "Email support",
      lgpdLinkLabel: "LGPD channel",
    },
  };
}
