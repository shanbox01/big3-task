import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f699d6fc-250e-496c-8428-c015d229e6ae',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/trpc.ts:getBaseUrl',message:'API URL resolved',data:{url:url??null,hasUrl:!!url,fullTrpcUrl:url?`${url}/api/trpc`:null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  if (!url) {
    throw new Error(
      "Rork did not set EXPO_PUBLIC_RORK_API_BASE_URL, please use support",
    );
  }

  return url;
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
