import { describe, it, expect } from "vitest";
import { escapeHtml, shell, welcomeEmailHtml, hackathonEmailHtml } from "@/lib/email";

describe("escapeHtml", () => {
  it("escapes all entities", () => {
    expect(escapeHtml("&<>\"'" )).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
  it("leaves safe text untouched", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });
  it("handles empty", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("email templates", () => {
  it("welcomeEmailHtml escapes name and contains shell", () => {
    const html = welcomeEmailHtml('<script>alert("x")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Welcome to");
  });
  it("hackathonEmailHtml escapes", () => {
    const html = hackathonEmailHtml("A&B");
    expect(html).toContain("A&amp;B");
  });
  it("shell wraps inner", () => {
    const s = shell("<p>hi</p>");
    expect(s).toContain("<p>hi</p>");
    expect(s).toContain("Iyin Ekiti TechFest");
  });
});
