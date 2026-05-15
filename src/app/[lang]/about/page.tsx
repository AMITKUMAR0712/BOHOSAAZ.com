import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AboutStatic, { metadata as staticMetadata } from "@/app/about/page";

export async function generateMetadata(): Promise<Metadata> {
	const page = await prisma.cmsPage.findUnique({
		where: { slug: "about" },
		select: { title: true },
	});

	if (!page?.title) return staticMetadata;
	return { title: `${page.title} | Bohosaaz` };
}

export default async function AboutPage() {
	const page = await prisma.cmsPage.findUnique({
		where: { slug: "about" },
		select: { title: true, content: true },
	});

	if (!page) return <AboutStatic />;

	return (
		<div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
			<div className="rounded-4xl border border-border bg-card/70 backdrop-blur-xl p-6 md:p-10 shadow-premium">
				<h1 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground">{page.title}</h1>
				<div className="mt-5 whitespace-pre-wrap text-sm md:text-base text-muted-foreground leading-relaxed">
					{page.content}
				</div>
			</div>
		</div>
	);
}
