// middleware.ts
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // In v4, all routes are PROTECTED by default. 
  // You list the routes you want to be PUBLIC here.
  publicRoutes: ["/((?!home).*)"], 
  
  // If you want to explicitly protect only /home:
  // It is often easier to let the default protection work 
  // and just list everything else as public.
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};