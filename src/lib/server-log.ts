import debug from "debug";

export const federationLog = debug("blog:federation");
export const federationInboxLog = debug("blog:federation:inbox");
export const federationDeliveryLog = debug("blog:federation:delivery");
export const storageLog = debug("blog:storage");
