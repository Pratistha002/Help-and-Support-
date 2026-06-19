import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employee Management",
  description: "Employee management dashboard UI for managers and HR teams.",
};

const globalCss = `
  *, *::before, *::after { box-sizing: border-box; }
  html { overflow-x: hidden; }
  body {
    margin: 0;
    padding: 0;
    font-family: Inter, "Segoe UI", system-ui, sans-serif;
    background: #f8fafc;
    color: #0f172a;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  a { color: inherit; }
  button { font-family: inherit; }
  table { border-spacing: 0; }
  .manager-kpi-grid {
    display: grid;
    gap: 12px;
    min-width: 0;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  @media (max-width: 900px) {
    .manager-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 480px) {
    .manager-kpi-grid { grid-template-columns: minmax(0, 1fr); }
  }
  .manager-two-col {
    display: grid;
    gap: 18px;
    min-width: 0;
    align-items: stretch;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 760px) {
    .manager-two-col { grid-template-columns: minmax(0, 1fr); }
  }
  .manager-engagement-grid {
    display: grid;
    gap: 12px;
    min-width: 0;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  @media (max-width: 900px) {
    .manager-engagement-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 480px) {
    .manager-engagement-grid { grid-template-columns: minmax(0, 1fr); }
  }
  .manager-dash-card {
    position: relative;
    transition: box-shadow 0.22s ease, border-color 0.22s ease, transform 0.22s ease;
  }
  .manager-dash-card:hover {
    box-shadow: 0 12px 40px -18px rgba(15, 23, 42, 0.14), 0 4px 12px -6px rgba(15, 23, 42, 0.08);
    border-color: #e2e8f0;
  }
  .manager-file-zone {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px dashed #cbd5e1;
    background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  }
  .manager-file-zone:hover {
    border-color: #10b981;
    background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
  }
  .manager-file-zone input[type="file"] {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .manager-toolbar-field:focus {
    outline: none;
    border-color: #818cf8 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.22);
  }
  .ui-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    color: #4338ca;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0f172a" />
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body>
        <header
          style={{
            background: "#0f172a",
            color: "#fff",
            padding: "12px clamp(16px, 3vw, 24px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              EM
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15 }}>Employee Management</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>Help & Support · UI Preview</div>
            </div>
          </div>
          <span className="ui-badge">UI only · mock data</span>
        </header>
        <main
          style={{
            width: "100%",
            maxWidth: 1280,
            margin: "0 auto",
            padding: "18px clamp(12px, 3vw, 20px) 32px",
            boxSizing: "border-box",
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
