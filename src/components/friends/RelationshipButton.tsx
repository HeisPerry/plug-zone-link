import { useFriendActions, type Relationship } from "@/hooks/useFriends";
import { useToast } from "@/components/shared/Toast";

export function RelationshipButton({ rel, userId, className }: { rel: Relationship; userId: string; className?: string }) {
  const { send, accept } = useFriendActions();
  const toast = useToast();
  const base = className ?? "btn btn-sm";
  if (rel.kind === "friends")
    return (
      <button className={`${base} btn-secondary`} disabled>
        Friends
      </button>
    );
  if (rel.kind === "outgoing")
    return (
      <button className={`${base} btn-secondary`} disabled>
        Pending
      </button>
    );
  if (rel.kind === "incoming")
    return (
      <button className={`${base} btn-primary`} onClick={() => accept.mutate(rel.requestId, { onSuccess: () => toast.success("Friend request accepted") })}>
        Accept
      </button>
    );
  return (
    <button className={`${base} btn-primary`} disabled={send.isPending} onClick={() => send.mutate(userId, { onSuccess: () => toast.success("Friend request sent"), onError: (e) => toast.error(e.message) })}>
      Add Friend
    </button>
  );
}

