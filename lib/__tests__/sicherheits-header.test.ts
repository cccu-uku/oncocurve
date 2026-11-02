import { describe, it, expect } from "vitest";
import { sicherheitsHeader, pruefeFreigaben } from "../sicherheits-header";

describe("sicherheitsHeader", () => {
  it("erlaubt ohne Freigabe nur den eigenen Ursprung", () => {
    const h = sicherheitsHeader({ frameAncestors: undefined, produktion: true });
    expect(h["Content-Security-Policy"]).toContain("frame-ancestors 'self'");
    expect(h["X-Frame-Options"]).toBe("SAMEORIGIN");
  });

  it("übernimmt freigegebene Ursprünge und lässt X-Frame-Options weg", () => {
    const h = sicherheitsHeader({ frameAncestors: "https://portal.example.org  https://intranet.example.org", produktion: true });
    expect(h["Content-Security-Policy"]).toContain(
      "frame-ancestors 'self' https://portal.example.org https://intranet.example.org",
    );
    expect(h["X-Frame-Options"]).toBeUndefined();
  });

  it("verwirft Werte, die keine http(s)-Ursprünge sind", () => {
    const h = sicherheitsHeader({ frameAncestors: "https://ok.example.org *; script-src 'unsafe-eval' javascript:", produktion: true });
    expect(h["Content-Security-Policy"]).toMatch(/frame-ancestors 'self' https:\/\/ok\.example\.org$/);
    expect(h["Content-Security-Policy"]).not.toContain("unsafe-eval");
  });

  it("setzt im Entwicklungsmodus keine CSP", () => {
    const h = sicherheitsHeader({ frameAncestors: undefined, produktion: false });
    expect(h["Content-Security-Policy"]).toBeUndefined();
    expect(h["X-Frame-Options"]).toBe("SAMEORIGIN");
  });

  const csp = (frameAncestors: string | undefined) =>
    sicherheitsHeader({ frameAncestors, produktion: true })["Content-Security-Policy"];

  it("akzeptiert einen abschließenden Schrägstrich", () => {
    expect(csp("https://portal.example.org/")).toMatch(/frame-ancestors 'self' https:\/\/portal\.example\.org$/);
  });

  it("akzeptiert Wildcard-Subdomains und Wildcard-Ports", () => {
    expect(csp("https://*.example.org")).toMatch(/frame-ancestors 'self' https:\/\/\*\.example\.org$/);
    expect(csp("http://host.example.org:8080")).toMatch(/frame-ancestors 'self' http:\/\/host\.example\.org:8080$/);
    expect(csp("https://h.example.org:*")).toMatch(/frame-ancestors 'self' https:\/\/h\.example\.org:\*$/);
  });

  it("akzeptiert Großschreibung", () => {
    expect(csp("HTTPS://Portal.Example.org")).toMatch(/frame-ancestors 'self' HTTPS:\/\/Portal\.Example\.org$/);
  });

  it("trennt auch an Zeilenumbrüchen", () => {
    expect(csp("https://a.example.org\nhttps://b.example.org")).toMatch(
      /frame-ancestors 'self' https:\/\/a\.example\.org https:\/\/b\.example\.org$/,
    );
  });

  it.each(["", "   \n "])("behandelt leeren Wert %j wie keine Freigabe", (wert) => {
    const h = sicherheitsHeader({ frameAncestors: wert, produktion: true });
    expect(h["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(h["Content-Security-Policy"]).toMatch(/frame-ancestors 'self'$/);
  });

  it.each(["https://a.org;script-src", "https://a.org'", "'none'", "*", "https://a.org/pfad"])(
    "verwirft %s",
    (wert) => {
      const h = sicherheitsHeader({ frameAncestors: wert, produktion: true });
      expect(h["Content-Security-Policy"]).toMatch(/frame-ancestors 'self'$/);
      expect(h["X-Frame-Options"]).toBe("SAMEORIGIN");
      expect(pruefeFreigaben(wert)).toEqual({ gueltig: [], verworfen: [wert] });
    },
  );

  it("pruefeFreigaben trennt gültige und verworfene Werte", () => {
    expect(pruefeFreigaben("https://ok.example.org/ bad'value *")).toEqual({
      gueltig: ["https://ok.example.org"],
      verworfen: ["bad'value", "*"],
    });
    expect(pruefeFreigaben(undefined)).toEqual({ gueltig: [], verworfen: [] });
  });
});
