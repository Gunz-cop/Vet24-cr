import { getCollection } from "astro:content";
import { buildMarkdownMirrors } from "../../lib/agent-markdown.ts";

export const prerender = true;

export async function getStaticPaths() {
  const entries = await getCollection("clinicas");
  return buildMarkdownMirrors(entries).map(({ route, content }) => ({
    params: { path: route.mirrorPath.replace(/^\/md\//, "") },
    props: { content },
  }));
}

export async function GET({ props }: { props: { content: string } }) {
  return new Response(props.content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "X-Robots-Tag": "noindex",
    },
  });
}
