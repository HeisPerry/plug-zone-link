import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type Ad = Tables["ads"]["Row"];
export type Order = Tables["orders"]["Row"];
export type Conversation = Tables["conversations"]["Row"];
export type Message = Tables["messages"]["Row"];
export type FriendRequest = Tables["friend_requests"]["Row"];
export type Friendship = Tables["friendships"]["Row"];
export type DailyCheckin = Tables["daily_checkins"]["Row"];
export type DataAirtimeOrder = Tables["data_airtime_orders"]["Row"];

export type ProfileLite = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

export type AdWithSeller = Ad & { seller: ProfileLite };
export type OrderWithDetails = Order & {
  ad: Pick<Ad, "id" | "title" | "images" | "currency">;
  buyer: ProfileLite;
  seller: ProfileLite;
};
export type ConversationWithOther = Conversation & {
  other: ProfileLite;
  lastMessage: Pick<Message, "content" | "created_at" | "sender_id"> | null;
  unread: number;
};

export type NotificationPrefs = { messages: boolean; orders: boolean; friend_requests: boolean };
