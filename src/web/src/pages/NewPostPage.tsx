import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "../components/atoms";
import { ErrorMessage, FormField, MediaPicker } from "../components/molecules";
import { useLanguage } from "../providers/LanguageProvider";
import { api } from "../shared/api/client";

export function NewPostPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: api.createPost,
    onSuccess: () => navigate("/"),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const media = data.get("media");
    const occurredOn = String(data.get("occurredOn") ?? "");
    const caption = String(data.get("caption") ?? "");

    if (!(media instanceof File) || media.size === 0) {
      setError(t.mediaRequired);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      setError(t.invalidDate);
      return;
    }
    if (caption.length > 2000) {
      setError(t.captionTooLong);
      return;
    }

    mutation.mutate(data, {
      onError: (reason) => setError(reason.message),
    });
  }

  return (
    <main className="narrow">
      <NavLink to="/" className="back">
        ← {t.back}
      </NavLink>
      <h1>{t.keepToday}</h1>
      <form className="post-form" onSubmit={submit} noValidate>
        <MediaPicker preview={preview} onChange={setPreview} />
        <FormField
          label={t.memoryDate}
          name="occurredOn"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
        <FormField
          textarea
          label={t.note}
          name="caption"
          maxLength={2000}
          rows={4}
          placeholder={t.notePlaceholder}
        />
        <ErrorMessage>{error}</ErrorMessage>
        <Button disabled={mutation.isPending}>
          {mutation.isPending ? t.saving : t.saveMemory}
        </Button>
      </form>
    </main>
  );
}
