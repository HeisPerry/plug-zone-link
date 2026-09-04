import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/PageLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — PlugZone" },
      { name: "description", content: "How PlugZone collects, uses, protects, and shares your information, and the choices you have." },
      { property: "og:title", content: "Privacy Policy — PlugZone" },
      { property: "og:description", content: "How PlugZone handles your information." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="September 4, 2026"
      intro="PlugZone respects your privacy. This policy describes how we collect, use, protect, and share information when you use the Platform."
      sections={[
        {
          heading: "Information We Collect",
          items: [
            "Name or display name",
            "Username",
            "Email address",
            "Profile information",
            "Advertisement information",
            "Images you upload",
            "Orders and transaction information",
            "Messages and social activity",
            "Reviews and ratings",
            "Device and technical information",
            "Cookies and similar technologies",
          ],
        },
        {
          heading: "How We Use Information",
          items: [
            "Provide PlugZone services",
            "Manage accounts",
            "Display listings",
            "Process orders and payments",
            "Calculate fees",
            "Provide messaging and notifications",
            "Prevent fraud and abuse",
            "Improve the Platform",
            "Provide support",
            "Meet legal requirements",
          ],
        },
        {
          heading: "Payments",
          body: "Payment transactions may involve third-party payment providers. Those providers process sensitive payment details (such as card or bank information) under their own privacy policies; PlugZone receives only what is needed to confirm and record the transaction.",
        },
        {
          heading: "Information Sharing",
          body: "We share information only where necessary: with service providers, payment providers, and infrastructure providers that help run the Platform; with legal authorities where required by law; and with other users where information is intentionally public, such as your username, display name, profile, ads, and reviews.",
        },
        {
          heading: "Messaging and Social Features",
          body: "We process the information needed to provide messaging, friendships, following, reviews, presence, and other social features, including delivering messages and showing activity to the people you interact with.",
        },
        {
          heading: "Cookies",
          body: "We use cookies and similar browser storage for sessions and sign-in, security, remembering preferences such as theme and \"Remember me\", analytics, and core Platform functionality.",
        },
        {
          heading: "Security",
          body: "We use reasonable technical and organisational measures to protect your information, including encrypted connections and access controls. No internet service can guarantee absolute security.",
        },
        {
          heading: "Data Retention",
          body: "We keep information as long as necessary to operate the Platform, complete transactions, prevent fraud, resolve disputes, and meet legal obligations. Transaction records may be retained after an account is closed where the law requires it.",
        },
        {
          heading: "Privacy Rights",
          body: "Depending on where you live, you may have the right to access, correct, delete, or request a copy of your information, or to object to certain processing. You can update most details from Settings or contact us to exercise these rights.",
        },
        {
          heading: "Account Deletion",
          body: "You can request account deletion from Settings at any time. We will remove your profile, ads, and messages, except for information PlugZone is legally required to retain, such as certain payment records.",
        },
        {
          heading: "Changes",
          body: "We may update this Privacy Policy when necessary. The \"Last Updated\" date shows the current version, and we will notify you of significant changes.",
        },
        {
          heading: "Contact",
          body: (
            <>
              For privacy questions or requests, email{" "}
              <a href="mailto:privacy@plugzone.app" className="font-medium text-primary">
                privacy@plugzone.app
              </a>
              . Our <Link to="/terms" className="font-medium text-primary">Terms of Service</Link> also apply.
            </>
          ),
        },
      ]}
    />
  );
}
