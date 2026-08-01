import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { Spinner } from "../atoms";
import { useLanguage } from "../../providers/LanguageProvider";

// molecules: 複数のatomやHTML要素を組み合わせた、小さな意味のあるUI単位。
export function FormField({
  label,
  textarea,
  ...props
}: {
  label: string;
  textarea?: boolean;
} & InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label>
      {label}
      {textarea ? <textarea {...props} /> : <input {...props} />}
    </label>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function LoadingState({ text }: { text: string }) {
  return (
    <main className="center">
      <Spinner />
      <p>{text}</p>
    </main>
  );
}
export function ErrorMessage({ children }: { children?: ReactNode }) {
  return children ? (
    <p className="error" role="alert">
      {children}
    </p>
  ) : null;
}
export function MediaPicker({
  preview,
  onChange,
}: {
  preview: string;
  onChange: (url: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <label className="drop">
      {preview ? (
        <img src={preview} alt={t.preview} />
      ) : (
        <>
          <b>{t.chooseMedia}</b>
          <small>{t.mediaFormats}</small>
        </>
      )}
      <input
        name="media"
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4"
        required
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onChange(URL.createObjectURL(file));
        }}
      />
    </label>
  );
}
