export default function PrivacyPage() {
  return (
    <div className="py-10">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-4 text-gray-700 leading-relaxed">
        We collect basic user information (name, email, address) to process orders and provide
        support. We do not sell personal data. Payment processing and courier integrations may
        share required information only for fulfillment.
      </p>

      <div className="mt-8 rounded-2xl border bg-white p-5">
        <div className="font-semibold">Data we store</div>
        <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-2">
          <li>Account info: email, name, phone</li>
          <li>Shipping address (for delivery)</li>
          <li>Order history for support and tracking</li>
        </ul>
      </div>
    </div>
  );
}
