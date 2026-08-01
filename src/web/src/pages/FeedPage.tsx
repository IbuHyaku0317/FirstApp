import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import {
  EmptyState,
  ErrorMessage,
  LoadingState,
} from "../components/molecules";
import { PostCard } from "../components/organisms/PostCard";
import { ContentTemplate } from "../components/templates";
import { useLanguage } from "../providers/LanguageProvider";
import { api } from "../shared/api/client";

export function FeedPage() {
  const { t } = useLanguage();
  const query = useQuery({ queryKey: ["posts"], queryFn: () => api.posts() });
  if (query.isPending) return <LoadingState text={t.loadingTimeline} />;
  const title = t.myMomentsTitle.split("\n");

  return (
    <ContentTemplate
      eyebrow="MY MOMENTS"
      title={
        <>
          {title[0]}
          <br />
          {title[1]}
        </>
      }
      description={t.myMomentsLead}
    >
      <section className="section-title">
        <h2>{t.recent}</h2>
        <NavLink to="/new">＋ {t.newPost}</NavLink>
      </section>
      <ErrorMessage>{query.error?.message}</ErrorMessage>
      <div className="grid">
        {query.data?.items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {query.data?.items.length === 0 && (
        <EmptyState title={t.firstMemory}>{t.firstMemoryLead}</EmptyState>
      )}
    </ContentTemplate>
  );
}
