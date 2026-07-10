import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PencilIcon, PlusIcon, TrashIcon } from "./icons";

describe("icon components", () => {
  it("renders as a decorative, hidden-from-AT svg", () => {
    const { container } = render(<PencilIcon />);
    const svg = container.querySelector("svg");

    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("forwards a className to the svg element", () => {
    const { container } = render(<TrashIcon className="h-4 w-4 text-danger" />);

    expect(container.querySelector("svg")).toHaveClass("h-4", "w-4", "text-danger");
  });

  it("exports a distinct icon per glyph", () => {
    const { container: pencil } = render(<PencilIcon />);
    const { container: plus } = render(<PlusIcon />);

    expect(pencil.querySelector("svg")?.innerHTML).not.toEqual(
      plus.querySelector("svg")?.innerHTML,
    );
  });
});
