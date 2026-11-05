import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/components/PageStub";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard · Blob Gang" },
      { name: "description", content: "The fastest blobs in the gang." },
      { property: "og:title", content: "Leaderboard · Blob Gang" },
      { property: "og:description", content: "The fastest blobs in the gang." },
    ],
  }),
  component: () => <PageStub title="Leaderboard" blob="grumbo" />,
});
