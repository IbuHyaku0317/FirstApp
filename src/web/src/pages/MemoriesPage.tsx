import { useQuery } from "@tanstack/react-query";
import { EmptyState, LoadingState } from "../components/molecules";
import { PostCard } from "../components/organisms/PostCard";
import { ContentTemplate } from "../components/templates";
import { useLanguage } from "../providers/LanguageProvider";
import { api } from "../shared/api/client";

export function MemoriesPage() {
  const { t } = useLanguage();
  const query = useQuery({ queryKey: ["memories"], queryFn: api.memories });
  return (
    <ContentTemplate
      eyebrow="ON THIS DAY"
      title={t.onThisDay}
      description={t.onThisDayLead}
      small
    >
      {query.isPending ? (
        <LoadingState text={t.searchingMemories} />
      ) : (
        <div className="grid">
          {query.data?.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
      {query.data?.length === 0 && (
        <EmptyState title={t.noMemoryToday}>{t.noMemoryTodayLead}</EmptyState>
      )}
    </ContentTemplate>
  );
}
