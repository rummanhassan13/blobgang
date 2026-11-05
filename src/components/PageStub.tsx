import type { ReactNode } from "react";
import { Blob } from "@/components/blob/Blob";
import type { BlobType } from "@/lib/blobs";

export function PageStub({ title, blob, children }: { title: string; blob: BlobType; children?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="glass flex flex-col items-center rounded-[2rem] p-10 text-center">
        <Blob type={blob} size={110} animation="jiggle" />
        <h1 className="mt-4 text-3xl font-bold">{title}</h1>
        <div className="mt-2 text-muted-foreground">{children ?? "Coming in the next step."}</div>
      </div>
    </main>
  );
}
