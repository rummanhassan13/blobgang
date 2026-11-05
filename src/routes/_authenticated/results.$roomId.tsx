import { createFileRoute } from "@tanstack/react-router";
import { PageStub } from "@/components/PageStub";

export const Route = createFileRoute("/_authenticated/results/$roomId")({
  head: () => ({
    meta: [
      { title: "Results · Blob Gang" },
      { name: "description", content: "See who wobbled across the line first." },
      { property: "og:title", content: "Results · Blob Gang" },
      { property: "og:description", content: "See who wobbled across the line first." },
    ],
  }),
  component: () => <PageStub title="Results" blob="mochi" />,
});
