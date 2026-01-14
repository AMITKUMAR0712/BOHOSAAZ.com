import { isLocale } from "@/lib/i18n";
import CartClient from "@/app/cart/CartClient";

export default async function CartPage({
	params,
}: {
	params: Promise<{ lang: string }>;
}) {
	const { lang } = await params;
	if (!isLocale(lang)) throw new Error("Invalid locale");
	return <CartClient langPrefix={`/${lang}`} />;
}
