import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../providers/LanguageProvider";
import { api, type Post } from "../../shared/api/client";
import { TextButton } from "../atoms";

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const remove = useMutation({
    mutationFn: () => api.deletePost(post.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
  const media = post.media[0];
  const date = new Date(`${post.occurredOn}T00:00:00`).toLocaleDateString(
    t.locale,
    { month: "long", day: "numeric" },
  );

  return (
    <article className="post">
      <div className="post-date">
        <strong>{date}</strong>
        <span>{post.occurredOn.slice(0, 4)}</span>
      </div>
      {media &&
        (media.kind === "video" ? (
          <video controls src={media.url} />
        ) : (
          <img src={media.url} alt={post.caption ?? t.memoryPhoto} />
        ))}
      <div className="post-copy">
        <p>{post.caption || t.thisDayMemory}</p>
        <TextButton className="danger" onClick={() => remove.mutate()}>
          {t.delete}
        </TextButton>
      </div>
    </article>
  );
}
