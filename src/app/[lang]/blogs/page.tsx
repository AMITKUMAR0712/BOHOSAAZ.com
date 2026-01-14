import { redirect } from "next/navigation";

export default async function BlogsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/blog`);
}
