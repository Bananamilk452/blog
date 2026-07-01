import { dispatchComment } from "./dispatchComment";
import { dispatchPost } from "./dispatchPost";
import { log } from "./log";

import type { RequestContext } from "@fedify/fedify";

const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function dispatchNote(ctx: RequestContext<unknown>, values: { slug: string }) {
  log(`Dispatching Note object for slug: ${values.slug}`);

  return uuidPattern.test(values.slug) ? dispatchComment(ctx, values) : dispatchPost(ctx, values);
}
