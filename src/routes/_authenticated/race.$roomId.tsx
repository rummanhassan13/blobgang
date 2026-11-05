import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/components/PageStub";

export const Route = createFileRoute("/_authenticated/race/$roomId")({
  head: () => ({
    meta: [
      { title: "Race · Blob Gang" },
      { name: "description", content: "Type fast and push your blob to the finish line." },
      { property: "og:title", content: "Race · Blob Gang" },
      { property: "og:description", content: "Type fast and push your blob to the finish line." },
    ],
  }),
  component: () => <PageStub title="Race" blob="zippy" />,
});
