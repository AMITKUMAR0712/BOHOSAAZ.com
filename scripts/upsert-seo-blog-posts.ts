/**
 * Upsert GEO/AEO pillar blog posts into the database.
 * Usage: npx tsx scripts/upsert-seo-blog-posts.ts
 */
import { PrismaClient } from "@prisma/client";
import { SEO_PILLAR_POSTS } from "../src/lib/seo/pillar-posts";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  for (const post of SEO_PILLAR_POSTS) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        tags: post.tags,
        isPublished: true,
        publishedAt: now,
      },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        tags: post.tags,
        isPublished: true,
        publishedAt: now,
      },
    });
    console.log(`upserted blog: ${post.slug}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
