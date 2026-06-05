import LoginClient from "./LoginClient";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  params?: Promise<{ lang?: string }>;
  searchParams?: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const resolvedParams = (await params) ?? {};
  const resolvedSearch = (await searchParams) ?? {};
  const lang = resolvedParams.lang && isLocale(resolvedParams.lang) ? resolvedParams.lang : "en";
  const next = typeof resolvedSearch.next === "string" ? resolvedSearch.next : null;

  return <LoginClient langPrefix={`/${lang}`} next={next} />;
}
