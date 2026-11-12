import { render, screen } from "@testing-library/react";
import type { Brief } from "../api/client";
import { BriefView } from "./BriefView";

const brief: Brief = {
  date: "2026-11-10",
  generator: "gemini",
  created_at: "2026-11-10T05:30:00",
  sent_at: null,
  data: {
    content: {
      headline: "Godmorgon, Sverige",
      intro: "Det här händer idag.",
      sections: [{
        slug: "ekonomi", title: "Pengar", summary: "Första stycket.\n\nAndra stycket.",
        highlights: [{ article_id: 1, text: "Volvo rasar" }, { article_id: 99, text: "Saknas" }],
      }],
    },
    articles: { "1": { url: "https://example.com/volvo", title: "Volvo", source: "DN" } },
    section_names: { ekonomi: "Ekonomi" },
  },
};

test("renders sections, paragraphs and article links", () => {
  render(<BriefView brief={brief} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Godmorgon, Sverige");
  expect(screen.getByText("Andra stycket.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "DN →" })).toHaveAttribute("href", "https://example.com/volvo");
  expect(screen.getByText(/inte mejlad/)).toBeInTheDocument();
});
