import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/components/PageStub";

export const Route = createFileRoute("/_authenticated/lobby/$code")({
  head: () => ({
    meta: [
      { title: "Lobby · Blob Gang" },
      { name: "description", content: "Wait for your gang to join before the race starts." },
      { property: "og:title", content: "Lobby · Blob Gang" },
      { property: "og:description", content: "Wait for your gang to join before the race starts." },
    ],
  }),
  component: () => <PageStub title="Lobby" blob="gloop" />,
});
