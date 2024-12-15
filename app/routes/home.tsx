import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta(metaArgs: Route.MetaArgs) {
  return [
    { title: "Markitdown UI" },
    { name: "description", content: "Covert anything to Markdown" },
  ];
}

export default function Home() {
  return <Welcome />;
}
