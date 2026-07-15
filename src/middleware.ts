export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/my-tasks/:path*",
    "/tasks/:path*",
    "/clients/:path*",
    "/projects/:path*",
    "/time/:path*",
    "/invoices/:path*",
    "/team/:path*",
    "/chat/:path*",
    "/files/:path*",
    "/notes/:path*",
    "/settings/:path*",
    "/revenue/:path*",
    "/payslips/:path*",
    "/leaves/:path*",
  ],
};
