import type { ButtonHTMLAttributes, ReactNode } from "react";

// atoms: これ以上UI部品へ分割しない、アプリ全体で再利用する最小要素。
export function Button({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props}>{children}</button>;
}
export function TextButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`text-button ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}
export function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return <span className={large ? "avatar" : ""}>{name.slice(0, 1)}</span>;
}
