import { createFileRoute } from "@tanstack/react-router";
import { ForbiddenPage } from "@/components/forbidden";

export const Route = createFileRoute("/forbidden")({ component: ForbiddenRoute });

function ForbiddenRoute() {
  return <ForbiddenPage />;
}