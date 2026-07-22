import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import PrivacyStatic from "@/app/privacy/page";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
	const page = await prisma.cmsPage.findUnique({
		where: { slug: "privacy" },
		select: { title: true },
	});

	return buildMetadata({
		title: (page?.title || "Privacy Policy").replace(/\s*\|\s*Bohosaaz$/i, ""),
		description: "Read how Bohosaaz collects, uses and protects your personal information.",
		path: "/en/privacy",
	});
}

export default async function PrivacyPage() {
	const page = await prisma.cmsPage.findUnique({
		where: { slug: "privacy" },
		select: { title: true, content: true },
	});

	if (!page) return <PrivacyStatic />;

	return (
		<div className="py-10">
			<h1 className="text-3xl font-semibold">{page.title}</h1>
			<div className="mt-4 whitespace-pre-wrap text-muted-foreground leading-relaxed">{page.content}</div>
		</div>
	);
}
