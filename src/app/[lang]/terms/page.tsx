import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import TermsStatic from "@/app/terms/page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
	const page = await prisma.cmsPage.findUnique({
		where: { slug: "terms" },
		select: { title: true },
	});

	return buildMetadata({
		title: (page?.title || "Terms & Conditions").replace(/\s*\|\s*Bohosaaz$/i, ""),
		description: "Terms and conditions for shopping gift products on Bohosaaz.",
		path: "/en/terms",
	});
}

export default async function TermsPage() {
	const page = await prisma.cmsPage.findUnique({
		where: { slug: "terms" },
		select: { title: true, content: true },
	});

	if (!page) return <TermsStatic />;

	return (
		<div className="py-10">
			<h1 className="text-3xl font-semibold">{page.title}</h1>
			<div className="mt-4 whitespace-pre-wrap text-muted-foreground leading-relaxed">{page.content}</div>
		</div>
	);
}
