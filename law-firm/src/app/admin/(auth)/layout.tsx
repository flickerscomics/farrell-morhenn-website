import "../admin.css";

export const metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main id="main" className="auth-page">{children}</main>;
}
