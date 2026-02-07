declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>, options?: any): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  // Minimal typings for supabase-js used in edge functions (dev-only)
  export function createClient(url: string, key: string, opts?: any): any;
  const _default: { createClient: typeof createClient } & any;
  export default _default;
}

// Fallback generic module declaration for esm.sh imports used in Deno functions
declare module "https://esm.sh/*" {
  const whatever: any;
  export default whatever;
}
