import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/PageLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — PlugZone" },
      { name: "description", content: "The rules for using PlugZone: accounts, listings, offers and orders, payments and fees, and prohibited activity." },
      { property: "og:title", content: "Terms of Service — PlugZone" },
      { property: "og:description", content: "The rules for using the PlugZone marketplace." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="September 4, 2026"
      intro="Welcome to PlugZone. By creating an account or using PlugZone, you agree to these Terms of Service."
      sections={[
        {
          heading: "Using PlugZone",
          body: "PlugZone provides a marketplace where users can discover, advertise, buy, sell, communicate, and interact with other users. You must be legally able to enter into contracts to use the Platform.",
        },
        {
          heading: "Accounts",
          body: "Provide accurate information and keep your login credentials private. You are responsible for activity on your account. Do not impersonate others, create accounts for someone else, or use an account for fraudulent activity.",
        },
        {
          heading: "Listings and Transactions",
          body: "Sellers are responsible for providing accurate, complete listings and for having the right to sell what they list. Buyers and sellers must comply with applicable laws and complete transactions honestly. PlugZone is not a party to transactions between users.",
        },
        {
          heading: "Offers and Orders",
          body: "You may negotiate prices, make offers, accept or reject offers, and manage orders through the Platform. An accepted offer or placed order is an agreement between the buyer and the seller.",
        },
        {
          heading: "Payments and Fees",
          body: "PlugZone may process marketplace payments and may charge platform fees, service fees, commissions, processing fees, withdrawal fees, or other applicable charges. Applicable fees are shown to you before you confirm a payment or withdrawal where appropriate. Refunds and disputes are handled according to the order's status and our policies at the time.",
        },
        {
          heading: "Prohibited Activity",
          body: "You may not use PlugZone for scams, fraud, illegal products or services, stolen or counterfeit goods, malicious software, abuse, harassment, identity theft, circumventing platform fees, or any other prohibited activity.",
        },
        {
          heading: "Reviews and Messaging",
          body: "Reviews must reflect genuine experiences. Messaging must not be used for harassment, spam, fraud, malicious links, or other abuse. We may remove content that violates these rules.",
        },
        {
          heading: "Verification and Social Features",
          body: "Following, friendships, seller verification, ratings, and other social features are subject to the Platform's rules. Verification indicates that certain checks were completed; it is not a guarantee of any transaction.",
        },
        {
          heading: "User Content",
          body: "You keep ownership of the content you submit. You grant PlugZone the permission needed to host, store, display, and distribute that content as part of operating and promoting the Platform.",
        },
        {
          heading: "Account Restrictions",
          body: "PlugZone may suspend or terminate accounts involved in fraud, abuse, security violations, prohibited activity, or serious violations of these Terms, and may withhold funds connected to disputed or fraudulent activity while it is investigated.",
        },
        {
          heading: "Platform Availability",
          body: "PlugZone is provided on an \"as available\" basis and may occasionally experience downtime, maintenance, or technical issues. To the extent permitted by law, PlugZone is not liable for indirect losses arising from your use of the Platform.",
        },
        {
          heading: "Changes",
          body: "We may update these Terms from time to time. The \"Last Updated\" date shows the current version. Continuing to use PlugZone after a change means you accept the updated Terms.",
        },
        {
          heading: "Governing Law and Contact",
          body: (
            <>
              These Terms are governed by the laws of the Federal Republic of Nigeria, and disputes are subject to the courts of Nigeria unless applicable law gives you additional rights. Questions? Email{" "}
              <a href="mailto:support@plugzone.app" className="font-medium text-primary">
                support@plugzone.app
              </a>{" "}
              or see our <Link to="/privacy" className="font-medium text-primary">Privacy Policy</Link>.
            </>
          ),
        },
      ]}
    />
  );
}
