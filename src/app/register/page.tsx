import RegisterClient from "./RegisterClient";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type RegisterPageProps = {
  params?: Promise<{ lang?: string }>;
  searchParams?: Promise<{ next?: string | string[] }>;
};

export default async function RegisterPage({ params, searchParams }: RegisterPageProps) {
  const resolvedParams = (await params) ?? {};
  const resolvedSearch = (await searchParams) ?? {};
  const lang = resolvedParams.lang && isLocale(resolvedParams.lang) ? resolvedParams.lang : "en";
  const next = typeof resolvedSearch.next === "string" ? resolvedSearch.next : null;

  return <RegisterClient langPrefix={`/${lang}`} next={next} />;
}
