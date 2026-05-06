export default function ForbiddenPage() {
  return (
    <main style={{ padding: "3rem", fontFamily: "var(--font-geist-sans)" }}>
      <h1>Access denied</h1>
      <p>Your account does not have permission to view this section.</p>
      <a href="/">Go back to login</a>
    </main>
  );
}
