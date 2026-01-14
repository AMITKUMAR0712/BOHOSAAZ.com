export default function TermsPage() {
  return (
    <div className="py-10">
      <h1 className="text-3xl font-semibold">Terms & Conditions</h1>
      <p className="mt-4 text-gray-700 leading-relaxed">
        By using Bohosaaz, you agree to follow our platform rules. Vendors must provide accurate
        product details and fulfill orders on time. Customers must provide correct address/contact
        information. We reserve the right to suspend accounts for misuse or fraud.
      </p>

      <div className="mt-8 rounded-2xl border bg-white p-5">
        <div className="font-semibold">Key points</div>
        <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-2">
          <li>Orders are fulfilled vendor-wise.</li>
          <li>Refunds/returns depend on item status and approval flow.</li>
          <li>Fraudulent activity can lead to permanent suspension.</li>
        </ul>
      </div>
    </div>
  );
}
