import { isLocale } from "@/lib/i18n";
import CheckoutClient from "@/app/checkout/CheckoutClient";

export default async function CheckoutPage({
	params,
	searchParams,
}: {
	params: Promise<{ lang: string }>;
	searchParams?: Promise<{ orderId?: string | string[] }>;
}) {
	const { lang } = await params;
	const sp = (await searchParams) ?? {};
	const orderId = typeof sp.orderId === "string" ? sp.orderId : null;
	if (!isLocale(lang)) throw new Error("Invalid locale");
	return <CheckoutClient langPrefix={`/${lang}`} orderId={orderId} />;
}
