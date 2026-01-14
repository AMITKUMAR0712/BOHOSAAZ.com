import { isLocale } from "@/lib/i18n";
import CheckoutClient from "@/app/checkout/CheckoutClient";

export default async function CheckoutPage({
	params,
}: {
	params: Promise<{ lang: string }>;
}) {
	const { lang } = await params;
	if (!isLocale(lang)) throw new Error("Invalid locale");
	return <CheckoutClient langPrefix={`/${lang}`} />;
}
