import { dispatchComment } from "./dispatchComment";
import { dispatchPost } from "./dispatchPost";

import type { RequestContext } from "@fedify/fedify";

const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function dispatchArticle(ctx: RequestContext<unknown>, values: { slug: string }) {
  return uuidPattern.test(values.slug) ? dispatchComment(ctx, values) : dispatchPost(ctx, values);
}
