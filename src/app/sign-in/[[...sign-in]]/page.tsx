import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "48px 16px" }}>
      <SignIn />
    </div>
  );
}
